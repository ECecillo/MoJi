package httpapi

import (
	"encoding/json"
	"net/http"
	"sinogrammes/backend/internal/domain"
	"sinogrammes/backend/internal/ports"
)

type progressHandler struct {
	store ports.ProgressStore
}

func NewProgressHandler(store ports.ProgressStore) *progressHandler {
	return &progressHandler{store: store}
}

func (h *progressHandler) List(w http.ResponseWriter, r *http.Request) {
	entries, err := h.store.List(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(entries)
}

func (h *progressHandler) UpsertBatch(w http.ResponseWriter, r *http.Request) {
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
