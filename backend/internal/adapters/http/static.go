package httpapi

import (
	"net/http"
	"os"
	"path/filepath"
	"strings"
)

// spaFileServer serves the static frontend bundle from staticDir, falling back
// to index.html for any path that doesn't map to an existing file. This lets a
// single Go binary serve both the PWA and the API on one origin (cf. RFC 0011).
//
// Path traversal is prevented by cleaning the request path with a leading "/"
// before joining it to staticDir; only os.Stat is performed on the computed
// path (no content read), and serving goes through http.FileServer which has
// its own protections.
func spaFileServer(staticDir string) http.HandlerFunc {
	fs := http.FileServer(http.Dir(staticDir))
	return func(w http.ResponseWriter, r *http.Request) {
		clean := filepath.Clean("/" + strings.TrimPrefix(r.URL.Path, "/"))
		full := filepath.Join(staticDir, filepath.FromSlash(clean))
		if info, err := os.Stat(full); err != nil || info.IsDir() {
			// Fichier absent ou répertoire : on retombe sur index.html (SPA).
			r.URL.Path = "/"
		}
		fs.ServeHTTP(w, r)
	}
}
