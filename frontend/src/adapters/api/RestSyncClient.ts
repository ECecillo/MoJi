import type { ProgressEntry } from '../../domain/ports/ProgressRepository';
import type { SyncClient } from '../../domain/ports/SyncClient';

export class RestSyncClient implements SyncClient {
  constructor(private readonly baseUrl: string = '/api/progress') {}

  async pull(): Promise<ProgressEntry[]> {
    const resp = await fetch(this.baseUrl);
    if (!resp.ok) {
      throw new Error(`Failed to pull progress: ${resp.statusText}`);
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
