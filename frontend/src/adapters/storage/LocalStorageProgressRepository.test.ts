import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageProgressRepository } from './LocalStorageProgressRepository';
import type { ProgressEntry } from '../../domain/ports/ProgressRepository';

function makeRepo() {
  return new LocalStorageProgressRepository();
}

function entry(id: `char_${string}`, due: string, ease = 2.5): ProgressEntry {
  return {
    ref: { type: 'character', id },
    srs_state: { interval_days: 1, ease, due },
    stats: { attempts: 1, successes: 1, last_seen: due },
  };
}

describe('LocalStorageProgressRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('retourne [] sur un stockage vierge', async () => {
    expect(await makeRepo().list()).toEqual([]);
  });

  it('upsert ajoute une entrée puis list la retrouve', async () => {
    const repo = makeRepo();
    const e = entry('char_4F60', '2026-06-15');
    await repo.upsert(e);
    expect(await repo.list()).toEqual([e]);
  });

  it("upsert sur une ref existante remplace l'entrée (pas de doublon)", async () => {
    const repo = makeRepo();
    await repo.upsert(entry('char_4F60', '2026-06-15'));
    await repo.upsert(entry('char_4F60', '2026-06-20', 2.8));
    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.srs_state.due).toBe('2026-06-20');
    expect(list[0]?.srs_state.ease).toBeCloseTo(2.8);
  });

  it('get retourne null si la ref est absente', async () => {
    const repo = makeRepo();
    expect(await repo.get({ type: 'character', id: 'char_DEAD' })).toBeNull();
  });

  it("get retourne l'entrée existante", async () => {
    const repo = makeRepo();
    const e = entry('char_4F60', '2026-06-15');
    await repo.upsert(e);
    expect(await repo.get({ type: 'character', id: 'char_4F60' })).toEqual(e);
  });

  it("remove supprime l'entrée et préserve les autres", async () => {
    const repo = makeRepo();
    await repo.upsert(entry('char_4F60', '2026-06-15'));
    await repo.upsert(entry('char_4E00', '2026-06-16'));
    await repo.remove({ type: 'character', id: 'char_4F60' });

    const list = await repo.list();
    expect(list).toHaveLength(1);
    expect(list[0]?.ref.id).toBe('char_4E00');
  });

  it('persiste à travers plusieurs instances (= reload simulé)', async () => {
    await makeRepo().upsert(entry('char_4F60', '2026-06-15'));
    const reloaded = await makeRepo().list();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0]?.ref.id).toBe('char_4F60');
  });

  it('retourne [] si le blob est corrompu (JSON invalide)', async () => {
    window.localStorage.setItem('sinogrammes:progress', '{not json');
    expect(await makeRepo().list()).toEqual([]);
  });

  it('retourne [] si la version de schéma ne correspond pas', async () => {
    window.localStorage.setItem(
      'sinogrammes:progress',
      JSON.stringify({ schema_version: 999, data: [entry('char_X', '2026-06-15')] }),
    );
    expect(await makeRepo().list()).toEqual([]);
  });
});
