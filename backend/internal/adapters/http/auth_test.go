package httpapi

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestServer_APITokenAuth(t *testing.T) {
	const token = "s3cret-token"
	srv := NewServer(&mockProgressStore{}, "", token)

	do := func(method, path, authHeader string) int {
		req := httptest.NewRequest(method, path, nil)
		if authHeader != "" {
			req.Header.Set("Authorization", authHeader)
		}
		rr := httptest.NewRecorder()
		srv.ServeHTTP(rr, req)
		return rr.Code
	}

	t.Run("401 sans en-tête Authorization", func(t *testing.T) {
		assert.Equal(t, http.StatusUnauthorized, do(http.MethodGet, "/api/progress", ""))
	})

	t.Run("401 avec un mauvais jeton", func(t *testing.T) {
		assert.Equal(t, http.StatusUnauthorized, do(http.MethodGet, "/api/progress", "Bearer wrong"))
	})

	t.Run("401 avec un schéma non-Bearer", func(t *testing.T) {
		assert.Equal(t, http.StatusUnauthorized, do(http.MethodGet, "/api/progress", "Basic "+token))
	})

	t.Run("200 avec le bon jeton", func(t *testing.T) {
		assert.Equal(t, http.StatusOK, do(http.MethodGet, "/api/progress", "Bearer "+token))
	})

	t.Run("/health reste public même avec auth activée", func(t *testing.T) {
		assert.Equal(t, http.StatusOK, do(http.MethodGet, "/health", ""))
	})
}

func TestServer_APITokenDisabledWhenEmpty(t *testing.T) {
	srv := NewServer(&mockProgressStore{}, "", "")

	req := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
	rr := httptest.NewRecorder()
	srv.ServeHTTP(rr, req)

	// Jeton vide → auth désactivée, l'API répond sans en-tête.
	assert.Equal(t, http.StatusOK, rr.Code)
}
