package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func setupTest() {
	processed = sync.Map{}
	redisClient = nil
	dbPool = nil
}

func TestDeliverWebhook_Idempotency(t *testing.T) {
	setupTest()

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:             "test-id-1",
		Url:            srv.URL,
		Event:          "test-event",
		IdempotencyKey: "test-key-123",
		Body:           map[string]interface{}{"msg": "hello"},
	}

	deliverWebhook(req)
	if requestCount != 1 {
		t.Fatalf("expected first request to be sent, got %d", requestCount)
	}

	deliverWebhook(req)
	if requestCount != 1 {
		t.Fatalf("expected duplicate request to be skipped, got %d requests total", requestCount)
	}
}

func TestDeliverWebhook_Retry(t *testing.T) {
	setupTest()

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		if requestCount == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:    "test-id-2",
		Url:   srv.URL,
		Event: "test-retry",
		Body:  map[string]interface{}{"msg": "retry"},
	}

	start := time.Now()
	deliverWebhook(req)
	duration := time.Since(start)

	if requestCount != 2 {
		t.Fatalf("expected 2 attempts (1 failure, 1 success), got %d", requestCount)
	}

	if duration < 2*time.Second {
		t.Fatalf("expected at least 2 seconds backoff, got %v", duration)
	}
}

func TestDeliverWebhook_HMACSignature(t *testing.T) {
	setupTest()

	var receivedSignature string
	secret := "my-secret-token"

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedSignature = r.Header.Get("X-Webhook-Signature")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:          "test-id-3",
		Url:         srv.URL,
		Event:       "test-hmac",
		SecretToken: secret,
		Body:        map[string]interface{}{"msg": "hmac test"},
	}

	deliverWebhook(req)

	payload, _ := json.Marshal(req.Body)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	if receivedSignature != expectedSignature {
		t.Fatalf("expected HMAC signature %s, got %s", expectedSignature, receivedSignature)
	}
}

func TestDeliverWebhook_NoSecretNoSignature(t *testing.T) {
	setupTest()

	var receivedSignature string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedSignature = r.Header.Get("X-Webhook-Signature")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:    "test-id-4",
		Url:   srv.URL,
		Event: "test-no-secret",
		Body:  map[string]interface{}{"msg": "no secret"},
	}

	deliverWebhook(req)

	if receivedSignature != "" {
		t.Fatalf("expected no signature header, got %s", receivedSignature)
	}
}

func TestDeliverWebhook_AllRetriesFail(t *testing.T) {
	setupTest()

	var requestCount int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requestCount++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:    "test-id-5",
		Url:   srv.URL,
		Event: "test-all-fail",
		Body:  map[string]interface{}{"msg": "fail"},
	}

	deliverWebhook(req)

	if requestCount != 5 {
		t.Fatalf("expected 5 attempts, got %d", requestCount)
	}
}

func TestDeliverWebhook_EventHeader(t *testing.T) {
	setupTest()

	var receivedEvent string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedEvent = r.Header.Get("X-Webhook-Event")
		w.WriteHeader(http.StatusOK)
	}))
	defer srv.Close()

	req := DeliveryRequest{
		Id:    "test-id-6",
		Url:   srv.URL,
		Event: "order.delivered",
		Body:  map[string]interface{}{"orderId": "123"},
	}

	deliverWebhook(req)

	if receivedEvent != "order.delivered" {
		t.Fatalf("expected event header 'order.delivered', got '%s'", receivedEvent)
	}
}

func TestHealthEndpoint(t *testing.T) {
	req, _ := http.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	http.DefaultServeMux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestDeliverEndpoint(t *testing.T) {
	setupTest()

	body := DeliveryRequest{
		Id:    "test-id-7",
		Url:   "http://localhost:99999",
		Event: "test",
		Body:  map[string]interface{}{"key": "value"},
	}
	bodyBytes, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", "/deliver", bytes.NewBuffer(bodyBytes))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	http.DefaultServeMux.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["ok"] != true {
		t.Fatalf("expected ok: true")
	}
}
