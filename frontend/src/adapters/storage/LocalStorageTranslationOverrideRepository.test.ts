import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalStorageTranslationOverrideRepository } from './LocalStorageTranslationOverrideRepository';

function makeRepo() {
  return new LocalStorageTranslationOverrideRepository();
}

describe('LocalStorageTranslationOverrideRepository', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it('retourne une map vide sur un stockage vierge', async () => {
    const repo = makeRepo();
    expect(await repo.loadAll()).toEqual({});
  });

  it('persiste et relit une surcharge', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu', 'toi']);

    expect(await repo.loadAll()).toEqual({
      char_4F60: { fr: ['tu', 'toi'] },
    });
  });

  it('met à jour une surcharge sans toucher aux autres langues', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu, toi']);
    await repo.setForLanguage('char_4F60', 'es', ['tú']);

    expect(await repo.loadAll()).toEqual({
      char_4F60: { fr: ['tu, toi'], es: ['tú'] },
    });

    await repo.setForLanguage('char_4F60', 'fr', ['tu']);
    expect(await repo.loadAll()).toEqual({
      char_4F60: { fr: ['tu'], es: ['tú'] },
    });
  });

  it('passer un tableau vide supprime la surcharge pour la langue', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu']);
    await repo.setForLanguage('char_4F60', 'es', ['tú']);

    await repo.setForLanguage('char_4F60', 'fr', []);
    expect(await repo.loadAll()).toEqual({
      char_4F60: { es: ['tú'] },
    });
  });

  it("supprime l'entrée entière quand la dernière langue est vidée", async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu']);
    await repo.setForLanguage('char_4F60', 'fr', []);

    expect(await repo.loadAll()).toEqual({});
  });

  it('tronque les chaînes vides ou whitespace-only avant persistance', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu', '   ', '', 'toi']);

    expect(await repo.loadAll()).toEqual({
      char_4F60: { fr: ['tu', 'toi'] },
    });
  });

  it('clearForEntry supprime toutes les langues pour cette entrée', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu']);
    await repo.setForLanguage('char_4F60', 'es', ['tú']);
    await repo.setForLanguage('char_4EEC', 'fr', ['suffixe pluriel']);

    await repo.clearForEntry('char_4F60');
    expect(await repo.loadAll()).toEqual({
      char_4EEC: { fr: ['suffixe pluriel'] },
    });
  });

  it('clearAll vide tout', async () => {
    const repo = makeRepo();
    await repo.setForLanguage('char_4F60', 'fr', ['tu']);
    await repo.clearAll();

    expect(await repo.loadAll()).toEqual({});
  });

  it('retourne une map vide si le blob stocké est corrompu (JSON invalide)', async () => {
    window.localStorage.setItem('sinogrammes:translation_overrides', '{not json');
    const repo = makeRepo();
    expect(await repo.loadAll()).toEqual({});
  });

  it('retourne une map vide si la version de schéma ne correspond pas', async () => {
    window.localStorage.setItem(
      'sinogrammes:translation_overrides',
      JSON.stringify({ schema_version: 999, data: { char_4F60: { fr: ['tu'] } } }),
    );
    const repo = makeRepo();
    expect(await repo.loadAll()).toEqual({});
  });
});
