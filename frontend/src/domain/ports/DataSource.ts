/**
 * Port `DataSource` — accès aux données de référence (caractères, mots, decks).
 *
 * L'implémentation initiale (Lot 1) sera `BundledDataSource` : le JSON HSK est
 * embarqué dans le build (cf. RFC 0006, Option B). Une implémentation
 * `RemoteDataSource` pourra venir plus tard sans toucher au domaine.
 */

import type { Character, Deck, ReferenceData, Word } from '../schema/types';

export interface DataSource {
  load(): Promise<ReferenceData>;
  characters(): Promise<Character[]>;
  words(): Promise<Word[]>;
  decks(): Promise<Deck[]>;
}
