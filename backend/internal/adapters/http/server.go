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
//
// When apiToken is non-empty, the /api/* routes require a matching bearer token
// (cf. RFC 0014) ; /health and the static SPA stay public.
func NewServer(progressStore ports.ProgressStore, staticDir, apiToken string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)

	r.Method(http.MethodGet, "/health", NewHealthHandler())

	progressH := NewProgressHandler(progressStore)
	// Groupe /api : middleware d'auth appliqué uniquement si un jeton est
	// configuré (vide = ouvert, dev / LAN de confiance). Chemin exact sans
	// slash final (ce que le client appelle ; évite le catch-all SPA).
	r.Group(func(api chi.Router) {
		if apiToken != "" {
			api.Use(requireBearerToken(apiToken))
		}
		api.Get("/api/progress", progressH.List)
		api.Post("/api/progress", progressH.UpsertBatch)
	})

	if staticDir != "" {
		r.Handle("/*", spaFileServer(staticDir))
	}

	return r
}
