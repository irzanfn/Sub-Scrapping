package main

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func main() {
	secret := "zombie-jwt-super-secret-key-2026"

	claims := jwt.MapClaims{
		"userId": "test-user-123",
		"email":  "testuser@gmail.com",
		"exp":    time.Now().Add(72 * time.Hour).Unix(),
		"iat":    time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString([]byte(secret))
	if err != nil {
		fmt.Println("Error:", err)
		return
	}

	fmt.Println(tokenStr)
}
