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
