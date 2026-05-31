// Package ports declares the abstract interfaces consumed by the domain.
// Adapters (sqlite, http, ...) implement these interfaces. The domain
// imports ports but never the concrete adapters. Cf. RFC 0003.
package ports

import (
	"context"
	"sinogrammes/backend/internal/domain"
)

// ProgressStore defines the contract for persisting progress data.
type ProgressStore interface {
	// List returns all progress entries.
	List(ctx context.Context) ([]domain.ProgressEntry, error)

	// Get returns the progress entry for a specific target.
	Get(ctx context.Context, ref domain.ProgressTargetRef) (*domain.ProgressEntry, error)

	// UpsertBatch saves multiple progress entries, overwriting existing ones.
	UpsertBatch(ctx context.Context, entries []domain.ProgressEntry) error

	// Delete removes the progress entry for a specific target.
	Delete(ctx context.Context, ref domain.ProgressTargetRef) error
}
