import { describe, expect, it, vi } from 'vitest';
import type { ProgressEntry } from '../../domain/ports/ProgressRepository';
import { RestSyncClient } from './RestSyncClient';

const sample: ProgressEntry[] = [
  {
    ref: { type: 'character', id: 'char_1' },
    srs_state: { due: '2026-05-30', interval_days: 1, ease: 2.5 },
    stats: { attempts: 1, successes: 1, last_seen: '2026-05-29' },
  },
];

const baseUrl = 'http://localhost:8787/api/progress';
// Sans jeton (getToken explicite pour ne pas dépendre du localStorage de test).
const client = new RestSyncClient(baseUrl, () => '');

describe('RestSyncClient', () => {
  it('pull récupère les données et n’envoie pas d’en-tête Authorization sans jeton', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => sample,
    });

    const result = await client.pull();

    expect(global.fetch).toHaveBeenCalledWith(baseUrl, { headers: {} });
    expect(result).toEqual(sample);
  });

  it('envoie Authorization: Bearer <jeton> quand un jeton est présent (pull + push)', async () => {
    const authed = new RestSyncClient(baseUrl, () => 's3cret');

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => sample,
    });
    await authed.pull();
    expect(global.fetch).toHaveBeenCalledWith(baseUrl, {
      headers: { Authorization: 'Bearer s3cret' },
    });

    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    await authed.push(sample);
    expect(global.fetch).toHaveBeenCalledWith(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer s3cret' },
      body: JSON.stringify(sample),
    });
  });

  it('lève une erreur claire si la réponse est non-JSON (backend absent, fallback SPA)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
      json: async () => {
        throw new SyntaxError("Unexpected token '<'");
      },
    });

    await expect(client.pull()).rejects.toThrow('réponse non-JSON');
  });

  it('push envoie les données au serveur (sans jeton)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await client.push(sample);

    expect(global.fetch).toHaveBeenCalledWith(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sample),
    });
  });

  it('lève une erreur explicite sur 401 (jeton manquant/invalide)', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });

    await expect(client.pull()).rejects.toThrow('401');
    await expect(client.push([])).rejects.toThrow('401');
  });

  it("lève une erreur si la réponse n'est pas ok", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(client.pull()).rejects.toThrow('Failed to pull progress');
    await expect(client.push([])).rejects.toThrow('Failed to push progress');
  });
});
