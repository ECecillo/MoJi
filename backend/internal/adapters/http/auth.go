package httpapi

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

const bearerPrefix = "Bearer "

// requireBearerToken returns a middleware that rejects requests whose
// Authorization header does not carry exactly "Bearer <token>" (cf. RFC 0014).
// The comparison is constant-time to avoid leaking the token via timing.
func requireBearerToken(token string) func(http.Handler) http.Handler {
	expected := []byte(token)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, bearerPrefix) {
				unauthorized(w)
				return
			}
			provided := []byte(strings.TrimPrefix(header, bearerPrefix))
			if subtle.ConstantTimeCompare(provided, expected) != 1 {
				unauthorized(w)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func unauthorized(w http.ResponseWriter) {
	http.Error(w, "unauthorized", http.StatusUnauthorized)
}
