/**
 * Port `TranslationOverrideRepository` — surcharges locales des traductions
 * des entrées du glossaire (caractères et mots).
 *
 * Le bundle HSK 1 vendoré n'inclut que des traductions `en`. Cet objet permet
 * à l'utilisateur de saisir progressivement ses propres traductions FR (ou
 * dans toute autre langue) sans modifier les fichiers générés.
 *
 * Les surcharges sont **complètes par langue** : si l'utilisateur saisit une
 * trad FR, elle remplace intégralement la trad FR du bundle pour cette entrée.
 * Les autres langues sont conservées telles quelles via le helper `mergeTranslations`.
 *
 * L'implémentation initiale (Lot 2) cible `localStorage`. À terme, peut basculer
 * vers IndexedDB ou un backend (cf. découpage Lot 3+).
 */

export type EntryId = `char_${string}` | `word_${string}`;

export type LanguageCode = string; // ISO 639-1

/** Map langue → liste de traductions saisies par l'utilisateur pour une entrée. */
export type EntryOverride = Record<LanguageCode, string[]>;

/** Map de toutes les surcharges, indexée par id d'entrée. */
export type OverrideMap = Record<EntryId, EntryOverride>;

export interface TranslationOverrideRepository {
  /** Retourne toutes les surcharges connues. Map vide si aucun stockage. */
  loadAll(): Promise<OverrideMap>;

  /** Surcharge la liste de traductions pour `entryId` dans `lang`.
   *  Passer un tableau vide supprime la surcharge pour cette langue. */
  setForLanguage(entryId: EntryId, lang: LanguageCode, items: string[]): Promise<void>;

  /** Supprime toutes les surcharges pour une entrée donnée. */
  clearForEntry(entryId: EntryId): Promise<void>;

  /** Supprime absolument tout. Utile pour les tests et un futur "reset utilisateur". */
  clearAll(): Promise<void>;
}
