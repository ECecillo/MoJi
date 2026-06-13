package sqlite

import (
	"context"
	"os"
	"path/filepath"
	"sinogrammes/backend/internal/domain"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestProgressRepository(t *testing.T) {
	// Setup in-memory DB for tests
	// modernc.org/sqlite supports memory DB via ":memory:"
	// We need to point to the migrations directory.
	// We are in backend/internal/adapters/sqlite, migrations are in backend/migrations.
	migrationsDir := "../../../migrations"
	db, err := OpenDB(":memory:", migrationsDir)
	require.NoError(t, err)
	defer db.Close()

	repo := NewProgressRepository(db)
	ctx := context.Background()

	entry1 := domain.ProgressEntry{
		Ref: domain.ProgressTargetRef{Type: "character", ID: "char_1"},
		SrsState: domain.SrsState{
			IntervalDays: 1,
			Ease:         2.5,
			Due:          "2026-05-30",
		},
		Stats: domain.ProgressStats{
			Attempts:  1,
			Successes: 1,
			LastSeen:  "2026-05-29",
		},
	}

	t.Run("UpsertBatch and List", func(t *testing.T) {
		err := repo.UpsertBatch(ctx, []domain.ProgressEntry{entry1})
		assert.NoError(t, err)

		list, err := repo.List(ctx)
		assert.NoError(t, err)
		assert.Len(t, list, 1)
		assert.Equal(t, entry1, list[0])
	})

	t.Run("Get", func(t *testing.T) {
		got, err := repo.Get(ctx, entry1.Ref)
		assert.NoError(t, err)
		assert.NotNil(t, got)
		assert.Equal(t, entry1, *got)

		gotNone, err := repo.Get(ctx, domain.ProgressTargetRef{Type: "character", ID: "unknown"})
		assert.NoError(t, err)
		assert.Nil(t, gotNone)
	})

	t.Run("Update via UpsertBatch", func(t *testing.T) {
		updated := entry1
		updated.Stats.Attempts = 2
		err := repo.UpsertBatch(ctx, []domain.ProgressEntry{updated})
		assert.NoError(t, err)

		got, _ := repo.Get(ctx, entry1.Ref)
		assert.Equal(t, 2, got.Stats.Attempts)
	})

	t.Run("Delete", func(t *testing.T) {
		err := repo.Delete(ctx, entry1.Ref)
		assert.NoError(t, err)

		got, _ := repo.Get(ctx, entry1.Ref)
		assert.Nil(t, got)
	})
}

func TestProgressRepository_FieldAwareMerge(t *testing.T) {
	db, err := OpenDB(":memory:", "../../../migrations")
	require.NoError(t, err)
	defer db.Close()
	repo := NewProgressRepository(db)
	ctx := context.Background()

	ref := domain.ProgressTargetRef{Type: "character", ID: "char_merge"}
	base := domain.ProgressEntry{
		Ref:      ref,
		SrsState: domain.SrsState{IntervalDays: 4, Ease: 2.5, Due: "2026-06-10"},
		Stats:    domain.ProgressStats{Attempts: 5, Successes: 4, LastSeen: "2026-06-08"},
	}
	require.NoError(t, repo.UpsertBatch(ctx, []domain.ProgressEntry{base}))

	t.Run("entrant moins avancé (moins d'attempts) est ignoré", func(t *testing.T) {
		stale := base
		stale.Stats.Attempts = 3
		stale.Stats.LastSeen = "2026-06-09"
		stale.SrsState.IntervalDays = 1
		require.NoError(t, repo.UpsertBatch(ctx, []domain.ProgressEntry{stale}))

		got, _ := repo.Get(ctx, ref)
		assert.Equal(t, 5, got.Stats.Attempts)
		assert.Equal(t, 4, got.SrsState.IntervalDays)
	})

	t.Run("entrant plus avancé (plus d'attempts) gagne", func(t *testing.T) {
		ahead := base
		ahead.Stats.Attempts = 6
		ahead.SrsState.IntervalDays = 9
		require.NoError(t, repo.UpsertBatch(ctx, []domain.ProgressEntry{ahead}))

		got, _ := repo.Get(ctx, ref)
		assert.Equal(t, 6, got.Stats.Attempts)
		assert.Equal(t, 9, got.SrsState.IntervalDays)
	})

	t.Run("attempts égaux : last_seen le plus récent gagne", func(t *testing.T) {
		got0, _ := repo.Get(ctx, ref) // attempts=6, last_seen=2026-06-08
		tie := *got0
		tie.Stats.LastSeen = "2026-06-12"
		tie.SrsState.IntervalDays = 15
		require.NoError(t, repo.UpsertBatch(ctx, []domain.ProgressEntry{tie}))

		got, _ := repo.Get(ctx, ref)
		assert.Equal(t, "2026-06-12", got.Stats.LastSeen)
		assert.Equal(t, 15, got.SrsState.IntervalDays)
	})
}

func TestOpenDB_CreatesDirectory(t *testing.T) {
	tempDir, err := os.MkdirTemp("", "sino-test-*")
	require.NoError(t, err)
	defer os.RemoveAll(tempDir)

	dbPath := filepath.Join(tempDir, "subdir", "test.db")
	migrationsDir := "../../../migrations"

	db, err := OpenDB(dbPath, migrationsDir)
	assert.NoError(t, err)
	if db != nil {
		db.Close()
	}

	_, err = os.Stat(dbPath)
	assert.NoError(t, err)
}
