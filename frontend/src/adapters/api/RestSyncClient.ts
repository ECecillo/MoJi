import type { ProgressEntry } from '../../domain/ports/ProgressRepository';
import type { SyncClient } from '../../domain/ports/SyncClient';

export class RestSyncClient implements SyncClient {
  constructor(private readonly baseUrl: string = '/api/progress') {}

  async pull(): Promise<ProgressEntry[]> {
    const resp = await fetch(this.baseUrl);
    if (!resp.ok) {
      throw new Error(`Failed to pull progress: ${resp.statusText}`);
    }
    // Backend absent : le fallback SPA renvoie l'index.html en 200. On le détecte
    // sur le content-type pour lever une erreur claire au lieu d'un SyntaxError
    // cryptique au parse JSON (cf. offline-first, le sync est best-effort).
    const contentType = resp.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Failed to pull progress: réponse non-JSON (${contentType || 'inconnu'})`);
    }
    return (await resp.json()) as ProgressEntry[];
  }

  async push(entries: ProgressEntry[]): Promise<void> {
    const resp = await fetch(this.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entries),
    });
    if (!resp.ok) {
      throw new Error(`Failed to push progress: ${resp.statusText}`);
    }
  }
}
