package httpapi

import (
	"net/http"
	"sinogrammes/backend/internal/ports"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewServer builds the HTTP router with all routes registered.
func NewServer(progressStore ports.ProgressStore) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)

	r.Method(http.MethodGet, "/health", NewHealthHandler())

	progressH := NewProgressHandler(progressStore)
	r.Route("/api/progress", func(r chi.Router) {
		r.Get("/", progressH.List)
		r.Post("/", progressH.UpsertBatch)
	})

	return r
}
