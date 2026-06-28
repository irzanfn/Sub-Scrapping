package main

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// User represents a registered user stored in MongoDB.
type User struct {
	ID           bson.ObjectID `json:"id" bson:"_id,omitempty"`
	Email        string        `json:"email" bson:"email"`
	Name         string        `json:"name" bson:"name"`
	Picture      string        `json:"picture" bson:"picture"`
	Provider     string        `json:"provider" bson:"provider"`         // "google", "github", "manual"
	PasswordHash string        `json:"-" bson:"password_hash,omitempty"` // Hashed password
	UniqueEmail  string        `json:"unique_email" bson:"unique_email"`
	CreatedAt    time.Time     `json:"created_at" bson:"created_at"`
}

// GoogleTokenInfo holds the response from Google's tokeninfo endpoint.
type GoogleTokenInfo struct {
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	Aud           string `json:"aud"`
	Sub           string `json:"sub"`
}

// contextKey is a custom type for context keys to avoid collisions.
type contextKey string

const (
	ctxUserID    contextKey = "userId"
	ctxUserEmail contextKey = "userEmail"
)

var (
	jwtSecret      string
	googleClientID string
)

// InitAuth sets the JWT signing secret and Google Client ID.
func InitAuth(secret, clientID string) {
	jwtSecret = secret
	googleClientID = clientID
}

// verifyGoogleToken validates a Google ID token by calling Google's tokeninfo endpoint.
func verifyGoogleToken(idToken string) (*GoogleTokenInfo, error) {
	resp, err := http.Get("https://oauth2.googleapis.com/tokeninfo?id_token=" + idToken)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token verification failed: %s", string(body))
	}

	var info GoogleTokenInfo
	if err := json.NewDecoder(resp.Body).Decode(&info); err != nil {
		return nil, fmt.Errorf("failed to decode token info: %w", err)
	}

	// Ensure the token was issued for our application
	if info.Aud != googleClientID {
		return nil, fmt.Errorf("token audience mismatch: got %s, expected %s", info.Aud, googleClientID)
	}

	return &info, nil
}

// GenerateUniqueEmail creates a random unique email for webhook parsing.
func GenerateUniqueEmail() string {
	bytes := make([]byte, 4)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("track-%d@inbox.subslayer.com", time.Now().UnixNano())
	}
	return fmt.Sprintf("track-%s@inbox.subslayer.com", hex.EncodeToString(bytes))
}

// GenerateJWT creates a signed JWT containing the userId and email.
func GenerateJWT(userID, email string) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"email":  email,
		"exp":    time.Now().Add(72 * time.Hour).Unix(),
		"iat":    time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}

// ValidateJWT parses and validates a JWT, returning the userId and email from claims.
func ValidateJWT(tokenString string) (string, string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})
	if err != nil {
		return "", "", err
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return "", "", fmt.Errorf("invalid token")
	}

	userID, _ := claims["userId"].(string)
	email, _ := claims["email"].(string)
	return userID, email, nil
}

// AuthMiddleware protects routes by requiring a valid JWT Bearer token.
// It injects the userId and email into the request context.
func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			http.Error(w, "Missing or invalid Authorization header", http.StatusUnauthorized)
			return
		}

		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		userID, email, err := ValidateJWT(tokenStr)
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), ctxUserID, userID)
		ctx = context.WithValue(ctx, ctxUserEmail, email)
		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

// CORSMiddleware adds CORS headers to allow cross-origin requests from the frontend.
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// handleGoogleAuth processes Google SSO login requests.
func handleGoogleAuth(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var body struct {
		IDToken string `json:"id_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}
	defer r.Body.Close()

	if body.IDToken == "" {
		http.Error(w, "id_token is required", http.StatusBadRequest)
		return
	}

	// Verify with Google
	info, err := verifyGoogleToken(body.IDToken)
	if err != nil {
		log.Printf("Google token verification failed: %v", err)
		http.Error(w, "Invalid Google token", http.StatusUnauthorized)
		return
	}

	// Upsert user in MongoDB
	collection := db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	filter := bson.M{"email": info.Email}
	update := bson.M{
		"$set": bson.M{
			"email":   info.Email,
			"name":    info.Name,
			"picture": info.Picture,
		},
		"$setOnInsert": bson.M{
			"created_at": time.Now(),
			"unique_email": GenerateUniqueEmail(),
		},
	}
	opts := options.UpdateOne().SetUpsert(true)

	_, err = collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting user: %v", err)
		http.Error(w, "Failed to save user", http.StatusInternalServerError)
		return
	}

	// Retrieve the user to get the _id
	var user User
	if err := collection.FindOne(ctx, filter).Decode(&user); err != nil {
		log.Printf("Error finding user: %v", err)
		http.Error(w, "Failed to retrieve user", http.StatusInternalServerError)
		return
	}

	// Backfill unique_email for existing users
	if user.UniqueEmail == "" {
		user.UniqueEmail = GenerateUniqueEmail()
		collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"unique_email": user.UniqueEmail}})
	}

	// Generate JWT
	tokenStr, err := GenerateJWT(user.ID.Hex(), user.Email)
	if err != nil {
		log.Printf("Error generating JWT: %v", err)
		http.Error(w, "Failed to generate token", http.StatusInternalServerError)
		return
	}

	log.Printf("User authenticated: %s (%s)", user.Email, user.ID.Hex())

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenStr,
		"user": map[string]interface{}{
			"id":           user.ID.Hex(),
			"email":        user.Email,
			"name":         user.Name,
			"picture":      user.Picture,
			"unique_email": user.UniqueEmail,
		},
	})
}
