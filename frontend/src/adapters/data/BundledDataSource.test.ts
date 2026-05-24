import { BundledDataSource, BundledDataSourceError } from './BundledDataSource';
import hsk1Sample from '../../../../shared/schema/examples/hsk1_sample.json';
import generatedHsk1 from '../../data/hsk1.generated.json';

describe('BundledDataSource', () => {
  describe('avec la fixture partagée hsk1_sample.json', () => {
    const sample = hsk1Sample as unknown;

    it('valide la fixture et retourne le ReferenceData parsé', async () => {
      const ds = new BundledDataSource(sample);
      const data = await ds.load();
      expect(data.schema_version).toBe('1.0.0');
      expect(data.characters).toHaveLength(2);
      expect(data.words).toHaveLength(1);
      expect(data.decks).toHaveLength(1);
    });

    it('characters() retourne tous les caractères', async () => {
      const ds = new BundledDataSource(sample);
      const chars = await ds.characters();
      expect(chars.map((c) => c.hanzi)).toEqual(['你', '好']);
    });

    it('words() retourne tous les mots', async () => {
      const ds = new BundledDataSource(sample);
      const words = await ds.words();
      expect(words[0]?.hanzi).toBe('你好');
    });

    it('decks() retourne tous les decks', async () => {
      const ds = new BundledDataSource(sample);
      const decks = await ds.decks();
      expect(decks).toHaveLength(1);
      expect(decks[0]?.id).toBe('deck_hsk1_sample');
    });

    it('met en cache après la première validation (load idempotent)', async () => {
      const ds = new BundledDataSource(sample);
      const a = await ds.load();
      const b = await ds.load();
      expect(a).toBe(b);
    });

    it('ne re-valide pas les appels suivants (Zod appelé une seule fois)', async () => {
      const ds = new BundledDataSource(sample);
      await ds.load();
      await ds.characters();
      await ds.words();
      await ds.decks();
      // Smoke : si la validation Zod tournait à chaque appel, on ne le saurait
      // pas directement. On vérifie au moins que le même objet est retourné.
      const data = await ds.load();
      const chars = await ds.characters();
      expect(chars).toBe(data.characters);
    });
  });

  describe('refus des données invalides', () => {
    it('rejette un champ inconnu au top niveau (strict)', async () => {
      const ds = new BundledDataSource({
        schema_version: '1.0.0',
        characters: [],
        words: [],
        decks: [],
        unknown_field: true,
      });
      await expect(ds.load()).rejects.toThrow(BundledDataSourceError);
    });

    it('rejette une schema_version v2', async () => {
      const bad = { ...(hsk1Sample as Record<string, unknown>), schema_version: '2.0.0' };
      const ds = new BundledDataSource(bad);
      await expect(ds.load()).rejects.toThrow(BundledDataSourceError);
    });

    it('joint le chemin et le message Zod dans l’erreur', async () => {
      const ds = new BundledDataSource({ schema_version: 'pas une version' });
      await expect(ds.load()).rejects.toThrow(/schema_version/);
    });

    it('echec du load ne pollue pas le cache', async () => {
      const ds = new BundledDataSource({ schema_version: 'bad' });
      await expect(ds.load()).rejects.toThrow();
      // un second appel échoue toujours (pas de cache d'erreur silencieux)
      await expect(ds.load()).rejects.toThrow();
    });
  });

  describe('intégration sur la sortie réelle du pipeline', () => {
    it('parse hsk1.generated.json sans erreur (300 chars, ≥500 mots)', async () => {
      const ds = new BundledDataSource(generatedHsk1 as unknown);
      const data = await ds.load();
      expect(data.characters).toHaveLength(300);
      expect(data.words.length).toBeGreaterThanOrEqual(500);
      expect(data.decks.map((d) => d.id).sort()).toEqual([
        'deck_hsk1_characters',
        'deck_hsk1_words',
      ]);
    });
  });
});
