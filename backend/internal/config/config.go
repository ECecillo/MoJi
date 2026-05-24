// Package config loads runtime configuration from the environment.
package config

import (
	"fmt"
	"os"
	"strconv"
)

// Config holds the runtime configuration of the server.
// Values are read from environment variables with sensible defaults.
type Config struct {
	Host string
	Port int
}

// Load reads configuration from the environment and returns a populated Config.
// Returns an error if any value cannot be parsed.
func Load() (Config, error) {
	cfg := Config{
		Host: getEnv("SINO_HOST", "127.0.0.1"),
	}

	portStr := getEnv("SINO_PORT", "8787")
	port, err := strconv.Atoi(portStr)
	if err != nil {
		return Config{}, fmt.Errorf("invalid SINO_PORT %q: %w", portStr, err)
	}
	cfg.Port = port

	return cfg, nil
}

// Addr returns the listen address in the form "host:port".
func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
