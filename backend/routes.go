package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// ResendInboundPayload represents the JSON structure of a Resend inbound email webhook.
type ResendInboundPayload struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
	Text    string `json:"text"`
}

// SetupRoutes registers all HTTP route handlers using Go 1.22+ pattern matching.
func SetupRoutes(db *mongo.Database) *http.ServeMux {
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Zombie Subs Tracker API is running.")
	})

	// Auth routes
	mux.HandleFunc("POST /api/v1/auth/google", func(w http.ResponseWriter, r *http.Request) {
		handleGoogleAuth(w, r, db)
	})
	mux.HandleFunc("POST /api/v1/auth/register", func(w http.ResponseWriter, r *http.Request) {
		handleRegister(w, r, db)
	})
	mux.HandleFunc("POST /api/v1/auth/login", func(w http.ResponseWriter, r *http.Request) {
		handleLogin(w, r, db)
	})
	mux.HandleFunc("GET /api/v1/auth/github", HandleGitHubLogin)
	mux.HandleFunc("GET /api/v1/auth/github/callback", func(w http.ResponseWriter, r *http.Request) {
		HandleGitHubCallback(w, r, db)
	})

	// Webhook (authenticated via WEBHOOK_SECRET, not JWT)
	mux.HandleFunc("POST /api/v1/webhook/receipt", func(w http.ResponseWriter, r *http.Request) {
		handleWebhookReceipt(w, r, db)
	})

	// CRUD — protected by JWT AuthMiddleware
	mux.HandleFunc("GET /api/v1/subscriptions", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleGetSubscriptions(w, r, db)
	}))
	mux.HandleFunc("POST /api/v1/subscriptions", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleCreateSubscription(w, r, db)
	}))
	mux.HandleFunc("PUT /api/v1/subscriptions/{id}", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleUpdateSubscription(w, r, db)
	}))
	mux.HandleFunc("DELETE /api/v1/subscriptions/{id}", AuthMiddleware(func(w http.ResponseWriter, r *http.Request) {
		handleDeleteSubscription(w, r, db)
	}))

	return mux
}

// --- Webhook Handler ---

func handleWebhookReceipt(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	// Verify the webhook secret token
	expectedToken := os.Getenv("WEBHOOK_SECRET")
	if expectedToken == "" {
		log.Println("WARNING: WEBHOOK_SECRET is not set, rejecting all webhook requests")
		http.Error(w, "Server misconfiguration", http.StatusInternalServerError)
		return
	}

	authHeader := r.Header.Get("Authorization")
	if authHeader != "Bearer "+expectedToken {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Decode the JSON body
	var payload ResendInboundPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Use the text body for parsing; fall back to subject if empty
	rawText := payload.Text
	if rawText == "" {
		rawText = payload.Subject
	}
	if rawText == "" {
		http.Error(w, "No text content found in payload", http.StatusBadRequest)
		return
	}

	// Parse the receipt text using LLM
	parsed, err := ParseReceiptLLM(rawText)
	if err != nil {
		log.Printf("Error parsing receipt: %v", err)
		http.Error(w, "Failed to parse receipt", http.StatusInternalServerError)
		return
	}

	if !parsed.IsReceipt {
		log.Printf("LLM determined this is not a receipt (promotional email). Ignoring.")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"status": "ignored_promotion"})
		return
	}

	// Try to match the "to" email to a registered user's UniqueEmail
	userID := ""
	if payload.To != "" {
		toEmail := extractEmail(payload.To)
		if toEmail != "" {
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()

			var user User
			err := db.Collection("users").FindOne(ctx, bson.M{"unique_email": toEmail}).Decode(&user)
			if err == nil {
				userID = user.ID.Hex()
				log.Printf("Webhook matched to user: %s (%s)", user.Email, userID)
			} else {
				log.Printf("No registered user found for unique_email: %s", toEmail)
			}
		}
	}

	// Calculate NextPayment based on cycle
	nextPayment := time.Now()
	if parsed.Cycle == "yearly" {
		nextPayment = nextPayment.AddDate(1, 0, 0)
	} else if parsed.Cycle == "weekly" {
		nextPayment = nextPayment.AddDate(0, 0, 7)
	} else {
		nextPayment = nextPayment.AddDate(0, 1, 0) // default monthly
	}

	// Insert or Update into MongoDB
	collection := db.Collection("subscriptions")
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	filter := bson.M{"user_id": userID, "merchant": parsed.Merchant}
	update := bson.M{
		"$set": bson.M{
			"amount":       parsed.Amount,
			"currency":     parsed.Currency,
			"cycle":        parsed.Cycle,
			"next_payment": nextPayment.Format("2006-01-02"),
			"source":       "auto",
		},
		"$setOnInsert": bson.M{
			"start_date": time.Now().Format("2006-01-02"),
			"created_at": time.Now(),
		},
	}
	
	opts := options.UpdateOne().SetUpsert(true)

	result, err := collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting subscription: %v", err)
		http.Error(w, "Failed to save subscription", http.StatusInternalServerError)
		return
	}

	log.Printf("Subscription saved/updated: %s | %s %.2f (%s) | User: %s | UpsertedID: %v",
		parsed.Merchant, parsed.Currency, parsed.Amount, parsed.Cycle, userID, result.UpsertedID)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "created",
		"id":     result.UpsertedID,
		"parsed": parsed,
	})
}

// --- CRUD Handlers ---

// handleGetSubscriptions returns all subscriptions belonging to the authenticated user.
func handleGetSubscriptions(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	userID := r.Context().Value(ctxUserID).(string)

	collection := db.Collection("subscriptions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	cursor, err := collection.Find(ctx, bson.M{"user_id": userID})
	if err != nil {
		log.Printf("Error fetching subscriptions: %v", err)
		http.Error(w, "Failed to fetch subscriptions", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(ctx)

	var subs []Subscription
	if err := cursor.All(ctx, &subs); err != nil {
		log.Printf("Error decoding subscriptions: %v", err)
		http.Error(w, "Failed to decode subscriptions", http.StatusInternalServerError)
		return
	}

	// Return empty array instead of null
	if subs == nil {
		subs = []Subscription{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(subs)
}

// handleCreateSubscription allows a user to manually add a subscription.
func handleCreateSubscription(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	userID := r.Context().Value(ctxUserID).(string)

	var body struct {
		Merchant string  `json:"merchant"`
		Amount   float64 `json:"amount"`
		Currency    string  `json:"currency"`
		Cycle       string  `json:"cycle"`
		Category    string  `json:"category"`
		NextPayment string  `json:"next_payment"`
		StartDate   string  `json:"start_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if body.Merchant == "" || body.Amount <= 0 || body.Currency == "" {
		http.Error(w, "merchant, amount, and currency are required", http.StatusBadRequest)
		return
	}

	// Default cycle to monthly
	if body.Cycle == "" {
		body.Cycle = "monthly"
	}

	sub := Subscription{
		UserID:    userID,
		Merchant:  body.Merchant,
		Amount:    body.Amount,
		Currency:  strings.ToUpper(body.Currency),
		Cycle:       body.Cycle,
		Category:    body.Category,
		NextPayment: body.NextPayment,
		StartDate:   body.StartDate,
		Source:      "manual",
		CreatedAt: time.Now(),
	}

	collection := db.Collection("subscriptions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	result, err := collection.InsertOne(ctx, sub)
	if err != nil {
		log.Printf("Error creating subscription: %v", err)
		http.Error(w, "Failed to create subscription", http.StatusInternalServerError)
		return
	}

	sub.ID = result.InsertedID

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(sub)
}

// handleUpdateSubscription allows a user to edit their own subscription.
func handleUpdateSubscription(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	userID := r.Context().Value(ctxUserID).(string)
	subID := r.PathValue("id")

	objID, err := bson.ObjectIDFromHex(subID)
	if err != nil {
		http.Error(w, "Invalid subscription ID", http.StatusBadRequest)
		return
	}

	var body struct {
		Merchant    string  `json:"merchant"`
		Amount      float64 `json:"amount"`
		Currency    string  `json:"currency"`
		Cycle       string  `json:"cycle"`
		Category    string  `json:"category"`
		NextPayment string  `json:"next_payment"`
		StartDate   string  `json:"start_date"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	// Build the update document with only provided fields
	updateFields := bson.M{}
	if body.Merchant != "" {
		updateFields["merchant"] = body.Merchant
	}
	if body.Amount > 0 {
		updateFields["amount"] = body.Amount
	}
	if body.Currency != "" {
		updateFields["currency"] = strings.ToUpper(body.Currency)
	}
	if body.Cycle != "" {
		updateFields["cycle"] = body.Cycle
	}
	if body.NextPayment != "" {
		updateFields["next_payment"] = body.NextPayment
	}
	if body.Category != "" {
		updateFields["category"] = body.Category
	}
	if body.StartDate != "" {
		updateFields["start_date"] = body.StartDate
	}

	if len(updateFields) == 0 {
		http.Error(w, "No fields to update", http.StatusBadRequest)
		return
	}

	collection := db.Collection("subscriptions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Only update if the subscription belongs to this user
	filter := bson.M{"_id": objID, "user_id": userID}
	update := bson.M{"$set": updateFields}

	result, err := collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("Error updating subscription: %v", err)
		http.Error(w, "Failed to update subscription", http.StatusInternalServerError)
		return
	}

	if result.MatchedCount == 0 {
		http.Error(w, "Subscription not found or not owned by you", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "updated"})
}

// handleDeleteSubscription allows a user to remove their own subscription.
func handleDeleteSubscription(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	userID := r.Context().Value(ctxUserID).(string)
	subID := r.PathValue("id")

	objID, err := bson.ObjectIDFromHex(subID)
	if err != nil {
		http.Error(w, "Invalid subscription ID", http.StatusBadRequest)
		return
	}

	collection := db.Collection("subscriptions")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Only delete if the subscription belongs to this user
	filter := bson.M{"_id": objID, "user_id": userID}
	result, err := collection.DeleteOne(ctx, filter)
	if err != nil {
		log.Printf("Error deleting subscription: %v", err)
		http.Error(w, "Failed to delete subscription", http.StatusInternalServerError)
		return
	}

	if result.DeletedCount == 0 {
		http.Error(w, "Subscription not found or not owned by you", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "deleted"})
}

// --- Helpers ---

// extractEmail pulls a clean email address from a string like "Name <email@example.com>"
func extractEmail(raw string) string {
	raw = strings.TrimSpace(raw)

	// Handle "Name <email@example.com>" format
	if start := strings.Index(raw, "<"); start != -1 {
		if end := strings.Index(raw, ">"); end != -1 && end > start {
			return strings.TrimSpace(raw[start+1 : end])
		}
	}

	// Already a plain email address
	if strings.Contains(raw, "@") {
		return raw
	}

	return ""
}
