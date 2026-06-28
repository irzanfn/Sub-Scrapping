package main

import (
	"testing"
)

func TestParseReceiptText_USDSymbol(t *testing.T) {
	text := "Receipt from Netflix\nYour monthly subscription\nTotal: $14.99\nThank you!"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "USD" {
		t.Errorf("expected currency USD, got %s", result.Currency)
	}
	if result.Amount != 14.99 {
		t.Errorf("expected amount 14.99, got %.2f", result.Amount)
	}
	if result.Cycle != "monthly" {
		t.Errorf("expected cycle monthly, got %s", result.Cycle)
	}
	if result.Merchant != "Netflix" {
		t.Errorf("expected merchant Netflix, got %s", result.Merchant)
	}
}

func TestParseReceiptText_IDRWithPeriodSeparator(t *testing.T) {
	text := "Invoice from Tokopedia\nPaket Langganan\nTotal: Rp 150.000\nTerima kasih"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "IDR" {
		t.Errorf("expected currency IDR, got %s", result.Currency)
	}
	if result.Amount != 150000 {
		t.Errorf("expected amount 150000, got %.2f", result.Amount)
	}
	if result.Merchant != "Tokopedia" {
		t.Errorf("expected merchant Tokopedia, got %s", result.Merchant)
	}
}

func TestParseReceiptText_EURWithCommaDecimal(t *testing.T) {
	text := "Receipt from Spotify\nPremium Plan\nTotal: €9,99\nMonthly billing"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "EUR" {
		t.Errorf("expected currency EUR, got %s", result.Currency)
	}
	if result.Amount != 9.99 {
		t.Errorf("expected amount 9.99, got %.2f", result.Amount)
	}
}

func TestParseReceiptText_YearlyCycle(t *testing.T) {
	text := "Invoice from Adobe\nCreative Cloud Annual Plan\nTotal: $599.88\nBilled yearly"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Cycle != "yearly" {
		t.Errorf("expected cycle yearly, got %s", result.Cycle)
	}
	if result.Amount != 599.88 {
		t.Errorf("expected amount 599.88, got %.2f", result.Amount)
	}
	if result.Merchant != "Adobe" {
		t.Errorf("expected merchant Adobe, got %s", result.Merchant)
	}
}

func TestParseReceiptText_GBPSymbol(t *testing.T) {
	text := "From: BBC iPlayer\nYour subscription\n£7.99 per month"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "GBP" {
		t.Errorf("expected currency GBP, got %s", result.Currency)
	}
	if result.Amount != 7.99 {
		t.Errorf("expected amount 7.99, got %.2f", result.Amount)
	}
}

func TestParseReceiptText_IDRTextPrefix(t *testing.T) {
	text := "Billing from GoTo\nGoPay Plus\nIDR 1.500.000 / 12 months"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "IDR" {
		t.Errorf("expected currency IDR, got %s", result.Currency)
	}
	if result.Amount != 1500000 {
		t.Errorf("expected amount 1500000, got %.0f", result.Amount)
	}
	if result.Cycle != "yearly" {
		t.Errorf("expected cycle yearly, got %s", result.Cycle)
	}
}

func TestParseReceiptText_USDWithCommaThousands(t *testing.T) {
	text := "From: Figma\nOrganization Plan\nUSD 1,200.00 annual subscription"

	result, err := ParseReceiptText(text)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Currency != "USD" {
		t.Errorf("expected currency USD, got %s", result.Currency)
	}
	if result.Amount != 1200.00 {
		t.Errorf("expected amount 1200.00, got %.2f", result.Amount)
	}
	if result.Cycle != "yearly" {
		t.Errorf("expected cycle yearly, got %s", result.Cycle)
	}
}

func TestCleanAmount_IDR(t *testing.T) {
	got := cleanAmount("150.000", "IDR")
	if got != 150000 {
		t.Errorf("expected 150000, got %.2f", got)
	}
}

func TestCleanAmount_USD(t *testing.T) {
	got := cleanAmount("1,234.56", "USD")
	if got != 1234.56 {
		t.Errorf("expected 1234.56, got %.2f", got)
	}
}

func TestCleanAmount_EuropeanComma(t *testing.T) {
	got := cleanAmount("14,99", "EUR")
	if got != 14.99 {
		t.Errorf("expected 14.99, got %.2f", got)
	}
}
