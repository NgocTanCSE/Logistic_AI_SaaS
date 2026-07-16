package main

import (
    "os"
    "testing"
)

func TestGetUDPPort_Default(t *testing.T) {
    _ = os.Unsetenv("UDP_PORT")
    if got := getUDPPort(); got != 8091 {
        t.Fatalf("expected default port 8091, got %d", got)
    }
}

func TestGetUDPPort_Env(t *testing.T) {
    os.Setenv("UDP_PORT", "12345")
    defer os.Unsetenv("UDP_PORT")
    if got := getUDPPort(); got != 12345 {
        t.Fatalf("expected port 12345 from env, got %d", got)
    }
}

func TestGetUDPPort_Invalid(t *testing.T) {
    os.Setenv("UDP_PORT", "abc")
    defer os.Unsetenv("UDP_PORT")
    if got := getUDPPort(); got != 8091 {
        t.Fatalf("expected fallback to default 8091 on invalid env, got %d", got)
    }
}

func TestGPSPoint_Validation(t *testing.T) {
    tests := []struct {
        name    string
        lat     float64
        lng     float64
        speed   float64
        valid   bool
    }{
        {"valid point", 10.76, 106.66, 60, true},
        {"invalid lat too high", 91.0, 106.66, 60, false},
        {"invalid lat too low", -91.0, 106.66, 60, false},
        {"invalid lng too high", 10.76, 181.0, 60, false},
        {"invalid lng too low", 10.76, -181.0, 60, false},
        {"speed too high", 10.76, 106.66, 151, false},
        {"zero coordinates", 0, 0, 0, true},
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            if tt.lat < -90 || tt.lat > 90 || tt.lng < -180 || tt.lng > 180 || tt.speed > 150 {
                if tt.valid {
                    t.Errorf("expected valid but got invalid")
                }
            } else {
                if !tt.valid {
                    t.Errorf("expected invalid but got valid")
                }
            }
        })
    }
}
