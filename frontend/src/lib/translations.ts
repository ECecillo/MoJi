import type { Translations } from '../domain/schema/types';
import type { EntryOverride } from '../domain/ports/TranslationOverrideRepository';

/**
 * Fusionne les traductions du bundle avec les surcharges utilisateur.
 *
 * Sémantique :
 * - Pour chaque langue présente dans `override`, la liste **remplace
 *   intégralement** celle du bundle. C'est volontaire : l'utilisateur veut
 *   contrôler exactement ce qui s'affiche en FR, pas voir s'empiler ses
 *   traductions à côté des sens upstream.
 * - Pour les langues absentes de `override`, la liste du bundle est gardée.
 * - Une langue avec un tableau vide dans `override` n'est pas censée arriver
 *   ici (l'adapter localStorage supprime ce cas), mais si elle arrive on
 *   préfère retomber sur la valeur bundle (pour ne pas perdre de signal).
 */
export function mergeTranslations(
  base: Translations,
  override: EntryOverride | undefined,
): Translations {
  if (!override) return base;
  const result: Translations = { ...base };
  for (const [lang, items] of Object.entries(override)) {
    if (items.length === 0) continue;
    result[lang] = items;
  }
  return result;
}
