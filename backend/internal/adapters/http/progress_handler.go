package httpapi

import (
	"encoding/json"
	"log"
	"net/http"
	"sinogrammes/backend/internal/domain"
	"sinogrammes/backend/internal/ports"
)

// ProgressHandler exposes the progress endpoints over HTTP. It is the
// HTTP adapter for the ports.ProgressStore port.
type ProgressHandler struct {
	store ports.ProgressStore
}

// NewProgressHandler builds a handler that delegates to the given store.
func NewProgressHandler(store ports.ProgressStore) *ProgressHandler {
	return &ProgressHandler{store: store}
}

// List handles GET /api/progress and returns every entry as JSON.
func (h *ProgressHandler) List(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.List(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// Headers déjà écrits — on logue plutôt que de propager au client.
	if err := json.NewEncoder(w).Encode(entries); err != nil {
		log.Printf("encode progress response: %v", err)
	}
}

// UpsertBatch handles POST /api/progress, upserting the entries in one
// transaction and returning 204 on success.
func (h *ProgressHandler) UpsertBatch(w http.ResponseWriter, r *http.Request) {
	var entries []domain.ProgressEntry
	if err := json.NewDecoder(r.Body).Decode(&entries); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.store.UpsertBatch(r.Context(), entries); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
