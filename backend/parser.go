package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
)

type ParsedData struct {
	IsReceipt bool    `json:"is_receipt"`
	Merchant  string  `json:"merchant"`
	Amount    float64 `json:"amount"`
	Currency  string  `json:"currency"`
	Cycle     string  `json:"cycle"`
}

// ParseReceiptLLM scans the raw email text using Gemini API and extracts the subscription data.
func ParseReceiptLLM(emailText string) (*ParsedData, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY is not set")
	}

	url := "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey

	prompt := `You are an AI assistant that extracts subscription receipt data from emails.
Analyze the following email text and determine if it is a receipt for a paid, RECURRING subscription.
If it is a promotional/marketing email (e.g. "Subscribe now for $5", "Special offer"), return {"is_receipt": false}.
If it is a one-time purchase from an e-commerce store (e.g. buying shoes, Amazon orders, Tokopedia items, food delivery), return {"is_receipt": false}.
If it is an actual receipt/invoice for a recurring subscription (e.g. Netflix, Spotify, gym, software, Tagihan Rutin), extract the merchant name, the total amount charged, the currency (as 3-letter ISO code like USD, IDR, EUR), and the billing cycle ("monthly", "yearly", "weekly"). 
Ensure the amount is extracted as a full, precise number (e.g., 15.49, not just the decimal part).
Return ONLY a valid JSON object matching this schema:
{
  "is_receipt": boolean,
  "merchant": string,
  "amount": number,
  "currency": string,
  "cycle": string
}

Email Text:
` + emailText

	requestBody, _ := json.Marshal(map[string]interface{}{
		"contents": []map[string]interface{}{
			{
				"parts": []map[string]interface{}{
					{"text": prompt},
				},
			},
		},
		"generationConfig": map[string]interface{}{
			"response_mime_type": "application/json",
		},
	})

	resp, err := http.Post(url, "application/json", bytes.NewBuffer(requestBody))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("gemini api error: %s", string(body))
	}

	var geminiResponse struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
		} `json:"candidates"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&geminiResponse); err != nil {
		return nil, err
	}

	if len(geminiResponse.Candidates) == 0 || len(geminiResponse.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("empty response from gemini")
	}

	jsonStr := geminiResponse.Candidates[0].Content.Parts[0].Text

	var result ParsedData
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, err
	}

	return &result, nil
}
