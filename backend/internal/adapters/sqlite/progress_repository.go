package sqlite

import (
	"context"
	"database/sql"
	"fmt"
	"sinogrammes/backend/internal/domain"
	"sinogrammes/backend/internal/ports"
)

type progressRepository struct {
	db *sql.DB
}

// NewProgressRepository creates a new SQLite implementation of the ProgressStore port.
func NewProgressRepository(db *sql.DB) ports.ProgressStore {
	return &progressRepository{db: db}
}

func (r *progressRepository) List(ctx context.Context) ([]domain.ProgressEntry, error) {
	query := `SELECT target_type, target_id, interval_days, ease, due, attempts, successes, last_seen FROM progress`
	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to list progress: %w", err)
	}
	defer func() { _ = rows.Close() }()

	var entries []domain.ProgressEntry
	for rows.Next() {
		var e domain.ProgressEntry
		err := rows.Scan(
			&e.Ref.Type,
			&e.Ref.ID,
			&e.SrsState.IntervalDays,
			&e.SrsState.Ease,
			&e.SrsState.Due,
			&e.Stats.Attempts,
			&e.Stats.Successes,
			&e.Stats.LastSeen,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan progress row: %w", err)
		}
		entries = append(entries, e)
	}

	return entries, nil
}

func (r *progressRepository) Get(ctx context.Context, ref domain.ProgressTargetRef) (*domain.ProgressEntry, error) {
	query := `SELECT target_type, target_id, interval_days, ease, due, attempts, successes, last_seen 
	          FROM progress WHERE target_type = ? AND target_id = ?`
	row := r.db.QueryRowContext(ctx, query, ref.Type, ref.ID)

	var e domain.ProgressEntry
	err := row.Scan(
		&e.Ref.Type,
		&e.Ref.ID,
		&e.SrsState.IntervalDays,
		&e.SrsState.Ease,
		&e.SrsState.Due,
		&e.Stats.Attempts,
		&e.Stats.Successes,
		&e.Stats.LastSeen,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to get progress: %w", err)
	}

	return &e, nil
}

func (r *progressRepository) UpsertBatch(ctx context.Context, entries []domain.ProgressEntry) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %w", err)
	}
	// Best-effort rollback : no-op après un Commit réussi.
	defer func() { _ = tx.Rollback() }()

	query := `INSERT INTO progress (target_type, target_id, interval_days, ease, due, attempts, successes, last_seen)
	          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	          ON CONFLICT(target_type, target_id) DO UPDATE SET
	            interval_days = excluded.interval_days,
	            ease = excluded.ease,
	            due = excluded.due,
	            attempts = excluded.attempts,
	            successes = excluded.successes,
	            last_seen = excluded.last_seen`

	stmt, err := tx.PrepareContext(ctx, query)
	if err != nil {
		return fmt.Errorf("failed to prepare upsert statement: %w", err)
	}
	defer func() { _ = stmt.Close() }()

	for _, e := range entries {
		_, err := stmt.ExecContext(ctx,
			e.Ref.Type,
			e.Ref.ID,
			e.SrsState.IntervalDays,
			e.SrsState.Ease,
			e.SrsState.Due,
			e.Stats.Attempts,
			e.Stats.Successes,
			e.Stats.LastSeen,
		)
		if err != nil {
			return fmt.Errorf("failed to execute upsert for %s:%s: %w", e.Ref.Type, e.Ref.ID, err)
		}
	}

	return tx.Commit()
}

func (r *progressRepository) Delete(ctx context.Context, ref domain.ProgressTargetRef) error {
	query := `DELETE FROM progress WHERE target_type = ? AND target_id = ?`
	_, err := r.db.ExecContext(ctx, query, ref.Type, ref.ID)
	if err != nil {
		return fmt.Errorf("failed to delete progress: %w", err)
	}
	return nil
}
