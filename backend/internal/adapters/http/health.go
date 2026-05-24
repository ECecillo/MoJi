// Package httpapi exposes the HTTP adapter of the backend.
// It wires the chi router and defines the inbound HTTP handlers.
package httpapi

import (
	"encoding/json"
	"net/http"
)

// schemaVersion is the version of the shared data schema this server understands.
// Kept in sync with shared/schema/data-schema.v1.json.
const schemaVersion = "1.0.0"

// NewHealthHandler returns a stateless handler that responds with the service status.
func NewHealthHandler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]string{
			"status":         "ok",
			"schema_version": schemaVersion,
		})
	})
}
