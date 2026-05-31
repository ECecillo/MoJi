import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgress } from './useProgress';
import type { SyncClient } from '../../domain/ports/SyncClient';

const mockSyncClient: SyncClient = {
  pull: vi.fn().mockResolvedValue([]),
  push: vi.fn().mockResolvedValue(undefined),
};

describe('useProgress (intégration localStorage + SM-2)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('entries vide au démarrage sur stockage vierge', async () => {
    const { result } = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entries).toEqual([]);
    expect(mockSyncClient.pull).toHaveBeenCalled();
  });

  it('recordSession crée une entrée avec quality 5 (0 refus) et déclenche sync', async () => {
    const { result } = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const today = new Date('2026-06-15T00:00:00Z');
    await act(async () => {
      await result.current.recordSession(
        { type: 'character', id: 'char_4F60' },
        { refusals: 0, completed: true },
        today,
      );
    });

    expect(result.current.entries).toHaveLength(1);
    const entry = result.current.entries[0]!;
    expect(entry.ref.id).toBe('char_4F60');
    expect(mockSyncClient.push).toHaveBeenCalled();
    expect(entry.srs_state.interval_days).toBe(1);
    expect(entry.srs_state.due).toBe('2026-06-16');
    expect(entry.stats).toEqual({ attempts: 1, successes: 1, last_seen: '2026-06-15' });
  });

  it('recordSession sur une entrée existante incrémente attempts et applique SM-2 cumulatif', async () => {
    const { result } = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.recordSession(
        { type: 'character', id: 'char_X' },
        { refusals: 0, completed: true },
        new Date('2026-06-15T00:00:00Z'),
      );
    });
    await act(async () => {
      await result.current.recordSession(
        { type: 'character', id: 'char_X' },
        { refusals: 0, completed: true },
        new Date('2026-06-16T00:00:00Z'),
      );
    });

    const entry = result.current.entries[0]!;
    expect(entry.stats.attempts).toBe(2);
    expect(entry.stats.successes).toBe(2);
    // Second succès consécutif → interval 6 jours
    expect(entry.srs_state.interval_days).toBe(6);
  });

  it("session incomplète (abandon) n'incrémente pas successes", async () => {
    const { result } = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.recordSession(
        { type: 'character', id: 'char_Y' },
        { refusals: 0, completed: false }, // abandon → quality 0
        new Date('2026-06-15T00:00:00Z'),
      );
    });

    const entry = result.current.entries[0]!;
    expect(entry.stats.attempts).toBe(1);
    expect(entry.stats.successes).toBe(0);
    expect(entry.srs_state.interval_days).toBe(0);
  });

  it('persiste à travers les sessions (reload simulé via une nouvelle instance)', async () => {
    const first = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    await act(async () => {
      await first.result.current.recordSession(
        { type: 'character', id: 'char_Z' },
        { refusals: 0, completed: true },
        new Date('2026-06-15T00:00:00Z'),
      );
    });

    // Nouveau hook = nouvelle instance de repository = simule un reload
    const second = renderHook(() => useProgress(undefined, mockSyncClient));
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.entries).toHaveLength(1);
    expect(second.result.current.entries[0]?.ref.id).toBe('char_Z');
  });
});
