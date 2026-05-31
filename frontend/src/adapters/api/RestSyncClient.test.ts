import { describe, expect, it, vi } from 'vitest';
import type { ProgressEntry } from '../../domain/ports/ProgressRepository';
import { RestSyncClient } from './RestSyncClient';

describe('RestSyncClient', () => {
  const baseUrl = 'http://localhost:8787/api/progress';
  const client = new RestSyncClient(baseUrl);

  it('pull récupère les données depuis le serveur', async () => {
    const mockData: ProgressEntry[] = [
      {
        ref: { type: 'character', id: 'char_1' },
        srs_state: { due: '2026-05-30', interval_days: 1, ease: 2.5 },
        stats: { attempts: 1, successes: 1, last_seen: '2026-05-29' },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await client.pull();

    expect(global.fetch).toHaveBeenCalledWith(baseUrl);
    expect(result).toEqual(mockData);
  });

  it('push envoie les données au serveur', async () => {
    const data: ProgressEntry[] = [
      {
        ref: { type: 'character', id: 'char_1' },
        srs_state: { due: '2026-05-30', interval_days: 1, ease: 2.5 },
        stats: { attempts: 1, successes: 1, last_seen: '2026-05-29' },
      },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
    });

    await client.push(data);

    expect(global.fetch).toHaveBeenCalledWith(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      statusText: 'Internal Server Error',
    });

    await expect(client.pull()).rejects.toThrow('Failed to pull progress');
    await expect(client.push([])).rejects.toThrow('Failed to push progress');
  });
});
