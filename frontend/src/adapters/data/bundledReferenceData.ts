import { BundledDataSource } from './BundledDataSource';

/**
 * Charge la source de données HSK bundlée en import dynamique mémoïsé.
 *
 * Les jeux par niveau (`hsk1.generated.json`, `hsk2.generated.json`, …) pèsent
 * chacun plusieurs centaines de Ko : les importer statiquement les ferait entrer
 * dans le chunk principal servi au tout premier rendu. En les chargeant en
 * dynamique, ils forment des chunks séparés (précachés par le service worker
 * pour l'offline) tandis que le shell applicatif démarre immédiatement.
 *
 * Les niveaux sont fusionnés (concat) en une seule `ReferenceData` puis une
 * unique instance `BundledDataSource` partagée — une seule validation Zod.
 * Ajouter HSK 3 = ajouter son import ici (cf. RFC 0012).
 */
interface ReferenceBlob {
  schema_version: string;
  characters: unknown[];
  words: unknown[];
  decks: unknown[];
}

let dataSourcePromise: Promise<BundledDataSource> | null = null;

export function loadBundledDataSource(): Promise<BundledDataSource> {
  if (!dataSourcePromise) {
    dataSourcePromise = Promise.all([
      import('../../data/hsk1.generated.json'),
      import('../../data/hsk2.generated.json'),
    ]).then((modules) => {
      const levels = modules.map((m) => m.default as ReferenceBlob);
      const first = levels[0];
      const merged: ReferenceBlob = {
        schema_version: first?.schema_version ?? '1.0.0',
        characters: levels.flatMap((l) => l.characters),
        words: levels.flatMap((l) => l.words),
        decks: levels.flatMap((l) => l.decks),
      };
      return new BundledDataSource(merged);
    });
  }
  return dataSourcePromise;
}
