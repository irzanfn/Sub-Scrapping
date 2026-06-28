package main

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/github"
)

var githubOauthConfig = &oauth2.Config{
	ClientID:     os.Getenv("GITHUB_CLIENT_ID"),
	ClientSecret: os.Getenv("GITHUB_CLIENT_SECRET"),
	Endpoint:     github.Endpoint,
	Scopes:       []string{"read:user", "user:email"},
}

// HandleGitHubLogin redirects to GitHub for authentication
func HandleGitHubLogin(w http.ResponseWriter, r *http.Request) {
	// Re-initialize config in case env vars were loaded late
	githubOauthConfig.ClientID = os.Getenv("GITHUB_CLIENT_ID")
	githubOauthConfig.ClientSecret = os.Getenv("GITHUB_CLIENT_SECRET")
	
	url := githubOauthConfig.AuthCodeURL("random_state_string", oauth2.AccessTypeOnline)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

// HandleGitHubCallback handles the callback from GitHub
func HandleGitHubCallback(w http.ResponseWriter, r *http.Request, db *mongo.Database) {
	code := r.URL.Query().Get("code")
	if code == "" {
		http.Redirect(w, r, "/?error=github_auth_failed", http.StatusTemporaryRedirect)
		return
	}

	token, err := githubOauthConfig.Exchange(context.Background(), code)
	if err != nil {
		http.Redirect(w, r, "/?error=github_exchange_failed", http.StatusTemporaryRedirect)
		return
	}

	client := githubOauthConfig.Client(context.Background(), token)

	// Get user profile
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		http.Redirect(w, r, "/?error=github_profile_failed", http.StatusTemporaryRedirect)
		return
	}
	defer resp.Body.Close()

	var githubUser map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&githubUser); err != nil {
		http.Redirect(w, r, "/?error=github_decode_failed", http.StatusTemporaryRedirect)
		return
	}

	// GitHub might not return public email in the /user endpoint, need to fetch emails if null
	email, _ := githubUser["email"].(string)
	if email == "" {
		emailResp, err := client.Get("https://api.github.com/user/emails")
		if err == nil {
			defer emailResp.Body.Close()
			var emails []map[string]interface{}
			if json.NewDecoder(emailResp.Body).Decode(&emails) == nil {
				for _, e := range emails {
					if primary, ok := e["primary"].(bool); ok && primary {
						if addr, ok := e["email"].(string); ok {
							email = addr
							break
						}
					}
				}
			}
		}
	}

	if email == "" {
		http.Redirect(w, r, "/?error=github_no_email", http.StatusTemporaryRedirect)
		return
	}

	name, _ := githubUser["name"].(string)
	if name == "" {
		name, _ = githubUser["login"].(string) // Fallback to username
	}
	
	avatarURL, _ := githubUser["avatar_url"].(string)

	collection := db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user User
	err = collection.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		// Create new user
		user = User{
			ID:        bson.NewObjectID(),
			Email:     email,
			Name:        name,
			Picture:     avatarURL,
			Provider:    "github",
			UniqueEmail: GenerateUniqueEmail(),
			CreatedAt:   time.Now(),
		}
		if _, err := collection.InsertOne(ctx, user); err != nil {
			http.Redirect(w, r, "/?error=db_error", http.StatusTemporaryRedirect)
			return
		}
	} else {
		// Backfill unique_email for existing users
		if user.UniqueEmail == "" {
			user.UniqueEmail = GenerateUniqueEmail()
			collection.UpdateOne(ctx, bson.M{"_id": user.ID}, bson.M{"$set": bson.M{"unique_email": user.UniqueEmail}})
		}
	}

	// Generate JWT
	jwtToken, err := GenerateJWT(user.ID.Hex(), user.Email)
	if err != nil {
		http.Redirect(w, r, "/?error=jwt_failed", http.StatusTemporaryRedirect)
		return
	}

	// Redirect to frontend with token
	redirectURL := os.Getenv("FRONTEND_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:3000"
	}
	http.Redirect(w, r, redirectURL+"/?token="+jwtToken, http.StatusTemporaryRedirect)
}
