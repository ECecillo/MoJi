package httpapi

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

// NewServer builds the HTTP router with all routes registered.
// This is the composition root for the HTTP adapter — additional handlers
// are wired here (or in dedicated route files when there are enough of them).
func NewServer() http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.Recoverer)

	r.Method(http.MethodGet, "/health", NewHealthHandler())

	return r
}
