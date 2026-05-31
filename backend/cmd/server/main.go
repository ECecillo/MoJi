// Command server is the entrypoint of the sinogrammes backend.
// It loads configuration, builds the HTTP adapter, and runs the server
// until SIGINT or SIGTERM triggers a graceful shutdown.
package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpapi "sinogrammes/backend/internal/adapters/http"
	"sinogrammes/backend/internal/adapters/sqlite"
	"sinogrammes/backend/internal/config"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("%v", err)
	}
}

func run() error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}

	db, err := sqlite.OpenDB(cfg.DBPath, cfg.MigrationsDir)
	if err != nil {
		return err
	}
	defer db.Close()

	progressStore := sqlite.NewProgressRepository(db)

	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           httpapi.NewServer(progressStore),
		ReadHeaderTimeout: 5 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	serverErr := make(chan error, 1)
	go func() {
		log.Printf("sinogrammes-backend listening on %s", cfg.Addr())
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
			return
		}
		serverErr <- nil
	}()

	select {
	case err := <-serverErr:
		return err
	case <-ctx.Done():
		log.Println("shutting down")
	}

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return srv.Shutdown(shutdownCtx)
}
