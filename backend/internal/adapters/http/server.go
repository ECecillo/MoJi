package httpapi

import (
	"net/http"
	"sinogrammes/backend/internal/ports"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewServer builds the HTTP router with all routes registered.
//
// When staticDir is non-empty, the built frontend it contains is served on the
// same origin as the API (single-origin deployment, cf. RFC 0011) : unknown
// routes fall back to index.html for the SPA. /health and /api/* keep priority.
func NewServer(progressStore ports.ProgressStore, staticDir string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)

	r.Method(http.MethodGet, "/health", NewHealthHandler())

	progressH := NewProgressHandler(progressStore)
	// Chemin exact sans slash final : c'est ce que le client appelle, et cela
	// évite que le catch-all SPA n'avale /api/progress.
	r.Get("/api/progress", progressH.List)
	r.Post("/api/progress", progressH.UpsertBatch)

	if staticDir != "" {
		r.Handle("/*", spaFileServer(staticDir))
	}

	return r
}
