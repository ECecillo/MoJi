import { BundledDataSource } from './BundledDataSource';

/**
 * Charge la source de données HSK 1 bundlée en import dynamique mémoïsé.
 *
 * `hsk1.generated.json` pèse ~480 KB : l'importer statiquement le ferait entrer
 * dans le chunk principal servi au tout premier rendu. En le chargeant en
 * dynamique, il forme un chunk séparé (précaché par le service worker pour
 * l'offline) tandis que le shell applicatif démarre immédiatement avec son état
 * de chargement existant.
 *
 * La promesse est mémoïsée : une seule instance `BundledDataSource` partagée
 * entre tous les consommateurs, donc une seule validation Zod.
 */
let dataSourcePromise: Promise<BundledDataSource> | null = null;

export function loadBundledDataSource(): Promise<BundledDataSource> {
  if (!dataSourcePromise) {
    dataSourcePromise = import('../../data/hsk1.generated.json').then(
      (module) => new BundledDataSource(module.default),
    );
  }
  return dataSourcePromise;
}
