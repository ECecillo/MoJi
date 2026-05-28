import type { PinyinSyllable } from '../domain/schema/types';

/**
 * Convertit une liste de syllabes pinyin en une chaîne lisible avec diacritiques.
 * Exemple : [{ syllable: 'ni', tone: 3 }] -> 'nǐ'
 */
export function pinyinToString(pinyin: PinyinSyllable[]): string {
  return pinyin.map((s) => syllableToString(s)).join('');
}

/**
 * Variante ASCII : strippe les diacritiques pour permettre une recherche
 * insensible aux tons. Exemple : [{ syllable: 'nǐ', tone: 3 }] -> 'ni'.
 *
 * Pratique dans le glossaire où l'utilisateur tape "ni hao" sans tons.
 */
export function pinyinToAscii(pinyin: PinyinSyllable[]): string {
  return pinyinToString(pinyin).normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Syllabe avec ton (0-4) vers chaîne accentuée. Le ton 0 = neutre,
 * pas de marque diacritique appliquée.
 */
function syllableToString({ syllable, tone }: PinyinSyllable): string {
  if (tone === 0) return syllable;

  const marks: Record<string, string[]> = {
    a: ['a', 'ā', 'á', 'ǎ', 'à'],
    e: ['e', 'ē', 'é', 'ě', 'è'],
    i: ['i', 'ī', 'í', 'ǐ', 'ì'],
    o: ['o', 'ō', 'ó', 'ǒ', 'ò'],
    u: ['u', 'ū', 'ú', 'ǔ', 'ù'],
    v: ['ü', 'ǖ', 'ǘ', 'ǚ', 'ǜ'],
  };

  // Règles de placement de l'accent pinyin :
  // 1. Si 'a' ou 'e', l'accent va dessus.
  // 2. Si 'ou', l'accent va sur 'o'.
  // 3. Sinon, l'accent va sur la dernière voyelle.
  let targetVowel = '';
  if (syllable.includes('a')) targetVowel = 'a';
  else if (syllable.includes('e')) targetVowel = 'e';
  else if (syllable.includes('ou')) targetVowel = 'o';
  else {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'v'];
    for (let i = syllable.length - 1; i >= 0; i--) {
      if (vowels.includes(syllable[i]!)) {
        targetVowel = syllable[i]!;
        break;
      }
    }
  }

  if (!targetVowel || !marks[targetVowel]) return syllable;

  return syllable.replace(targetVowel, marks[targetVowel]![tone]!);
}
