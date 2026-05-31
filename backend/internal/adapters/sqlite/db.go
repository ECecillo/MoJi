// Package sqlite implements the persistence adapters backed by SQLite
// (via modernc.org/sqlite, a pure-Go driver). It is the concrete side of
// the ports declared in internal/ports.
package sqlite

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	"github.com/pressly/goose/v3"
	// Register the pure-Go SQLite driver with database/sql under the
	// name "sqlite". Imported for its side effects only.
	_ "modernc.org/sqlite"
)

// OpenDB opens a SQLite database connection and runs migrations.
// migrationsDir is the path to the directory containing SQL migration files.
func OpenDB(dsn string, migrationsDir string) (*sql.DB, error) {
	// Ensure the directory for the database exists if it's a file path
	if dsn != ":memory:" {
		dir := filepath.Dir(dsn)
		// 0750 plutôt que 0755 : seul l'utilisateur et son groupe ont
		// accès au répertoire de la base, conforme à gosec G301.
		if err := os.MkdirAll(dir, 0750); err != nil {
			return nil, fmt.Errorf("failed to create database directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping sqlite db: %w", err)
	}

	// Run migrations
	if err := goose.SetDialect("sqlite3"); err != nil {
		return nil, fmt.Errorf("failed to set goose dialect: %w", err)
	}
	if err := goose.Up(db, migrationsDir); err != nil {
		return nil, fmt.Errorf("failed to run migrations: %w", err)
	}

	return db, nil
}
