package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sinogrammes/backend/internal/domain"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type mockProgressStore struct {
	entries []domain.ProgressEntry
}

func (m *mockProgressStore) List(ctx context.Context) ([]domain.ProgressEntry, error) {
	return m.entries, nil
}

func (m *mockProgressStore) Get(ctx context.Context, ref domain.ProgressTargetRef) (*domain.ProgressEntry, error) {
	for _, e := range m.entries {
		if e.Ref == ref {
			return &e, nil
		}
	}
	return nil, nil
}

func (m *mockProgressStore) UpsertBatch(ctx context.Context, entries []domain.ProgressEntry) error {
	for _, newEntry := range entries {
		found := false
		for i, existing := range m.entries {
			if existing.Ref == newEntry.Ref {
				m.entries[i] = newEntry
				found = true
				break
			}
		}
		if !found {
			m.entries = append(m.entries, newEntry)
		}
	}
	return nil
}

func (m *mockProgressStore) Delete(ctx context.Context, ref domain.ProgressTargetRef) error {
	for i, e := range m.entries {
		if e.Ref == ref {
			m.entries = append(m.entries[:i], m.entries[i+1:]...)
			break
		}
	}
	return nil
}

func TestProgressHandler_List(t *testing.T) {
	store := &mockProgressStore{
		entries: []domain.ProgressEntry{
			{Ref: domain.ProgressTargetRef{Type: "character", ID: "char_1"}},
		},
	}
	handler := NewProgressHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/progress", nil)
	rr := httptest.NewRecorder()

	handler.List(rr, req)

	assert.Equal(t, http.StatusOK, rr.Code)
	var got []domain.ProgressEntry
	require.NoError(t, json.Unmarshal(rr.Body.Bytes(), &got))
	assert.Len(t, got, 1)
	assert.Equal(t, "char_1", got[0].Ref.ID)
}

func TestProgressHandler_UpsertBatch(t *testing.T) {
	store := &mockProgressStore{}
	handler := NewProgressHandler(store)

	entries := []domain.ProgressEntry{
		{Ref: domain.ProgressTargetRef{Type: "character", ID: "char_2"}},
	}
	body, _ := json.Marshal(entries)

	req := httptest.NewRequest(http.MethodPost, "/api/progress", bytes.NewReader(body))
	rr := httptest.NewRecorder()

	handler.UpsertBatch(rr, req)

	assert.Equal(t, http.StatusNoContent, rr.Code)
	assert.Len(t, store.entries, 1)
	assert.Equal(t, "char_2", store.entries[0].Ref.ID)
}
