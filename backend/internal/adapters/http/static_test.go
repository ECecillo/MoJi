package httpapi

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestServer_ServesStaticAndSpaFallback(t *testing.T) {
	dir := t.TempDir()
	require.NoError(t, os.WriteFile(filepath.Join(dir, "index.html"), []byte("<!doctype html><title>app</title>"), 0o600))
	assetsDir := filepath.Join(dir, "assets")
	require.NoError(t, os.MkdirAll(assetsDir, 0o750))
	require.NoError(t, os.WriteFile(filepath.Join(assetsDir, "app.js"), []byte("console.log(1)"), 0o600))

	srv := NewServer(&mockProgressStore{}, dir, "")

	t.Run("sert un asset présent", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/assets/app.js", nil)
		rr := httptest.NewRecorder()
		srv.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "console.log")
	})

	t.Run("route inconnue : fallback index.html", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/glossary", nil)
		rr := httptest.NewRecorder()
		srv.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "<title>app</title>")
	})

	t.Run("racine : index.html", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		rr := httptest.NewRecorder()
		srv.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Contains(t, rr.Body.String(), "<title>app</title>")
	})

	t.Run("/api/progress reste l'API (pas l'index)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
		rr := httptest.NewRecorder()
		srv.ServeHTTP(rr, req)
		assert.Equal(t, http.StatusOK, rr.Code)
		assert.Equal(t, "application/json", rr.Header().Get("Content-Type"))
		assert.NotContains(t, rr.Body.String(), "<title>")
	})
}
