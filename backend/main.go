package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

// Subscription represents a tracked subscription entry stored in MongoDB.
type Subscription struct {
	ID        interface{} `json:"id" bson:"_id,omitempty"`
	UserID    string      `json:"user_id" bson:"user_id"`
	Merchant  string      `json:"merchant" bson:"merchant"`
	Amount    float64     `json:"amount" bson:"amount"`
	Currency    string             `bson:"currency" json:"currency"`
	Cycle       string             `bson:"cycle" json:"cycle"`
	Category    string             `bson:"category" json:"category"`
	Source      string             `bson:"source" json:"source"` // "manual" or "auto"
	NextPayment string             `bson:"next_payment,omitempty" json:"next_payment,omitempty"`
	StartDate   string             `bson:"start_date,omitempty" json:"start_date,omitempty"`
	CreatedAt   time.Time          `bson:"created_at" json:"created_at"`
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	mongoURI := os.Getenv("MONGO_URI")
	if mongoURI == "" {
		log.Fatal("MONGO_URI environment variable is required")
	}

	jwtSecretEnv := os.Getenv("JWT_SECRET")
	if jwtSecretEnv == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}

	googleClientIDEnv := os.Getenv("GOOGLE_CLIENT_ID")
	if googleClientIDEnv == "" {
		log.Fatal("GOOGLE_CLIENT_ID environment variable is required")
	}

	// Initialize auth module
	InitAuth(jwtSecretEnv, googleClientIDEnv)

	// Connect to MongoDB
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURI))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	// Ping to verify the connection
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}
	fmt.Println("Connected to MongoDB successfully")

	db := client.Database("zombiesubs")

	// Setup routes, passing the database instance
	mux := SetupRoutes(db)

	// Wrap with CORS middleware
	handler := CORSMiddleware(mux)

	fmt.Println("Server is starting on port", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
