package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:])
}

type GPSPoint struct {
	DriverID        string    `json:"driver_id"`
	TripID          string    `json:"trip_id"`
	Lat             float64   `json:"lat"`
	Lng             float64   `json:"lng"`
	Speed           float64   `json:"speed"`
	Heading         float64   `json:"heading"`
	IsOfflineCached bool      `json:"is_offline_cached"`
	Timestamp       time.Time `json:"timestamp"`
}

type BatchRequest struct {
	Points []GPSPoint `json:"points"`
}

var dbPool *pgxpool.Pool
var schemaName string
var gpsAuthToken string

func initDB() {
	schemaName = os.Getenv("DB_SCHEMA")
	if schemaName == "" {
		schemaName = "tenant"
	}

	gpsAuthToken = os.Getenv("GPS_AUTH_TOKEN")
	if gpsAuthToken == "" {
		log.Fatal("GPS_AUTH_TOKEN environment variable is required. Set a strong auth token for production.")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable is required")
	}

	var err error
	dbPool, err = pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	log.Println("Connected to PostgreSQL for GPS ingestion")
}

func main() {
	initDB()
	defer dbPool.Close()

	// Start UDP Server for high-throughput tracking
	go startUDPServer()

	// HTTP Server for Batch Offline Sync
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Simple health endpoint for API‑Gateway health aggregation
	http.HandleFunc("/gps", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok", "service": "gps-ingestion"})
	})

	http.HandleFunc("/gps/batch", handleGPSBatch)

	log.Println("🚀 GPS Ingestion HTTP Service running on :8090")
	log.Fatal(http.ListenAndServe(":8090", nil))
}

// getUDPPort returns the UDP port the server should bind to.
// It defaults to 8091, but can be overridden via the UDP_PORT environment variable.
func getUDPPort() int {
    port := 8091
    if envPort := os.Getenv("UDP_PORT"); envPort != "" {
        if p, err := strconv.Atoi(envPort); err == nil {
            port = p
        }
    }
    return port
}


func startUDPServer() {
    // Determine UDP port (default 8091) – can be overridden via UDP_PORT env var for testing or deployment flexibility
    port := getUDPPort()

    addr := net.UDPAddr{Port: port, IP: net.ParseIP("0.0.0.0")}
    conn, err := net.ListenUDP("udp", &addr)
    if err != nil {
        log.Fatalf("Failed to start UDP server: %v", err)
    }
    log.Printf("🚀 GPS Ingestion UDP Service running on :%d", port)

    // Worker pool – size equals number of logical CPUs for optimal concurrency
    workerCount := runtime.NumCPU()
    packetChan := make(chan []byte, 4096) // buffered to smooth bursts
    for i := 0; i < workerCount; i++ {
        go func() {
            for data := range packetChan {
                processUDPPacket(data)
            }
        }()
    }

    // Read Loop – copy packet data into channel for workers
    buffer := make([]byte, 4096)
    for {
        n, _, err := conn.ReadFromUDP(buffer)
        if err != nil {
            log.Printf("Error reading UDP: %v\n", err)
            continue
        }
        // Copy to avoid data race on the shared buffer
        data := make([]byte, n)
        copy(data, buffer[:n])
        // Block if channel is full, providing back‑pressure
        packetChan <- data
    }
}


func processUDPPacket(data []byte) {
	var pt GPSPoint
	if err := json.Unmarshal(data, &pt); err != nil {
		return
	}

	if pt.Lat < -90 || pt.Lat > 90 || pt.Lng < -180 || pt.Lng > 180 || pt.Speed > 150 {
		return
	}

	ctx := context.Background()
	_, err := dbPool.Exec(ctx, `
		INSERT INTO `+schemaName+`.gps_tracking_logs 
		(id, driver_id, trip_id, lat, lng, speed, heading, is_offline_cached, timestamp)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`, generateUUID(), pt.DriverID, pt.TripID, pt.Lat, pt.Lng, pt.Speed, pt.Heading, pt.IsOfflineCached, pt.Timestamp)

	if err != nil {
		return
	}

	_, _ = dbPool.Exec(ctx, `
		UPDATE `+schemaName+`.drivers
		SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
			location_updated_at = NOW()
		WHERE id = $3::uuid
	`, pt.Lng, pt.Lat, pt.DriverID)

	// Geofence check asynchronously
	go checkGeofence(context.Background(), pt.DriverID, pt.TripID, pt.Lng, pt.Lat)
}

func checkGeofence(ctx context.Context, driverId string, tripId string, lng, lat float64) {
	var fenceName, zoneType string
	err := dbPool.QueryRow(ctx, `
		SELECT name, zone_type FROM `+schemaName+`.geofences 
		WHERE is_active = true 
		  AND ST_Contains(polygon, ST_SetSRID(ST_MakePoint($1, $2), 4326)) = true
		LIMIT 1
	`, lng, lat).Scan(&fenceName, &zoneType)

	if err == nil {
		log.Printf("Driver %s entered Geofence [%s]: %s\n", driverId, zoneType, fenceName)
		if zoneType == "RESTRICTED" {
			_, _ = dbPool.Exec(ctx, `
				INSERT INTO `+schemaName+`.sos_alerts (id, driver_id, trip_id, message, status, created_at, updated_at)
				VALUES ($1, $2, $3, $4, 'OPEN', NOW(), NOW())
			`, generateUUID(), driverId, tripId, "GEOFENCE BREACH: Entered Restricted Zone - "+fenceName)
			log.Printf("SOS Alert generated for Driver %s\n", driverId)
		}
	}
}

func handleGPSBatch(w http.ResponseWriter, r *http.Request) {
	authHeader := r.Header.Get("Authorization")
	if authHeader != "Bearer "+gpsAuthToken {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var body BatchRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if len(body.Points) == 0 {
		json.NewEncoder(w).Encode(map[string]interface{}{"ok": true, "received": 0})
		return
	}

	ctx := context.Background()
	tx, err := dbPool.Begin(ctx)
	if err != nil {
		http.Error(w, "Internal error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback(ctx)

	for _, pt := range body.Points {
		if pt.Lat < -90 || pt.Lat > 90 || pt.Lng < -180 || pt.Lng > 180 || pt.Speed > 150 {
			continue
		}

		_, err := tx.Exec(ctx, `
			INSERT INTO `+schemaName+`.gps_tracking_logs 
			(id, driver_id, trip_id, lat, lng, speed, heading, is_offline_cached, timestamp)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		`, generateUUID(), pt.DriverID, pt.TripID, pt.Lat, pt.Lng, pt.Speed, pt.Heading, pt.IsOfflineCached, pt.Timestamp)
		
		if err != nil {
			log.Printf("❌ Error inserting GPS point: %v\n", err)
			continue
		}
	}

	lastPt := body.Points[len(body.Points)-1]
	_, _ = tx.Exec(ctx, `
		UPDATE `+schemaName+`.drivers
		SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326),
			location_updated_at = NOW()
		WHERE id = $3::uuid
	`, lastPt.Lng, lastPt.Lat, lastPt.DriverID)

	if err := tx.Commit(ctx); err != nil {
		http.Error(w, "Commit failed", http.StatusInternalServerError)
		return
	}

	// Async geofence check for the last point
	go checkGeofence(context.Background(), lastPt.DriverID, lastPt.TripID, lastPt.Lng, lastPt.Lat)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"ok":       true,
		"received": len(body.Points),
	})
}
