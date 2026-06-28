package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/crypto/bcrypt"
)

// RegisterRequest holds the payload for manual registration
type RegisterRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// LoginRequest holds the payload for manual login
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// handleRegister handles manual user registration
func handleRegister(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" {
		http.Error(w, "Name, Email, and Password are required", http.StatusBadRequest)
		return
	}

	collection := db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Check if user exists
	count, err := collection.CountDocuments(ctx, bson.M{"email": req.Email})
	if err != nil {
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}
	if count > 0 {
		http.Error(w, "User with this email already exists", http.StatusConflict)
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		http.Error(w, "Failed to hash password", http.StatusInternalServerError)
		return
	}

	newUser := User{
		ID:           bson.NewObjectID(),
		Email:        req.Email,
		Name:         req.Name,
		Picture:      "https://ui-avatars.com/api/?name=" + req.Name + "&background=random",
		Provider:     "manual",
		PasswordHash: string(hashedPassword),
		UniqueEmail:  GenerateUniqueEmail(),
		CreatedAt:    time.Now(),
	}

	_, err = collection.InsertOne(ctx, newUser)
	if err != nil {
		http.Error(w, "Failed to create user", http.StatusInternalServerError)
		return
	}

	// Generate JWT (assuming GenerateJWT is available from auth.go)
	tokenString, err := GenerateJWT(newUser.ID.Hex(), newUser.Email)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"user":  newUser,
	})
}

// handleLogin handles manual user login
func handleLogin(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	collection := db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user User
	err := collection.FindOne(ctx, bson.M{"email": req.Email}).Decode(&user)
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Check if provider is manual
	if user.Provider != "manual" && user.Provider != "" { // support empty string for older users
		http.Error(w, "Please login with "+user.Provider, http.StatusUnauthorized)
		return
	}

	// Compare passwords
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		http.Error(w, "Invalid email or password", http.StatusUnauthorized)
		return
	}

	// Backfill unique_email for existing users
	if user.UniqueEmail == "" {
		user.UniqueEmail = GenerateUniqueEmail()
		collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"unique_email": user.UniqueEmail}})
	}

	// Generate JWT
	tokenString, err := GenerateJWT(user.ID.Hex(), user.Email)
	if err != nil {
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"user":  user,
	})
}
