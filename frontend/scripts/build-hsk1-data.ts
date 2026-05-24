/**
 * build-hsk1-data.ts — produit `frontend/src/data/hsk1.generated.json` à partir
 * des sources vendorées dans `shared/data/sources/`.
 *
 * Étapes :
 *  1. Lecture des snapshots vendorés (aucun accès réseau).
 *  2. Construction des `characters[]` (300 hanzi distincts) et `words[]` (506
 *     entrées de vocabulaire), conformément au schéma v1 (cf. RFC 0004).
 *  3. Décodage des décompositions IDS makemeahanzi en composants feuilles
 *     pour peupler `radicals[]`.
 *  4. Validation **dure** de la sortie via les schémas Zod du domaine
 *     (`src/domain/schema/validators`). Si la validation échoue, le script
 *     exit non-zéro et aucun fichier n'est écrit.
 *  5. Écriture du JSON joliment indenté.
 *
 * Aucun appel réseau. Lance via `npm run build:data` depuis frontend/.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { referenceDataSchema } from '../src/domain/schema/validators';
import { REFERENCE_SCHEMA_VERSION } from '../src/domain/schema/version';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const SOURCES = resolve(REPO_ROOT, 'shared/data/sources');
const OUT_PATH = resolve(__dirname, '../src/data/hsk1.generated.json');

interface DrkTranscriptions {
  pinyin: string;
  numeric: string;
}

interface DrkForm {
  traditional?: string;
  transcriptions: DrkTranscriptions;
  meanings?: string[];
  classifiers?: string[];
}

interface DrkEntry {
  simplified: string;
  radical?: string;
  frequency?: number;
  pos?: string[];
  forms: DrkForm[];
}

interface MetaLine {
  character: string;
  hex: string;
  stroke_count: number;
  radical: string;
  decomposition: string;
  definition: string;
  pinyin: string[];
}

interface PinyinReading {
  syllable: string;
  tone: number;
}

function readDrkameleon(): DrkEntry[] {
  const raw = readFileSync(resolve(SOURCES, 'drkameleon-hsk30-l1.json'), 'utf-8');
  return JSON.parse(raw) as DrkEntry[];
}

function readMeta(): Map<string, MetaLine> {
  const raw = readFileSync(resolve(SOURCES, 'makemeahanzi-hsk1-meta.jsonl'), 'utf-8');
  const map = new Map<string, MetaLine>();
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const obj = JSON.parse(trimmed) as MetaLine;
    map.set(obj.character, obj);
  }
  return map;
}

function toLowerHex(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) throw new Error(`code point manquant pour ${JSON.stringify(ch)}`);
  return cp.toString(16).padStart(4, '0');
}

function toUpperHex(ch: string): string {
  return toLowerHex(ch).toUpperCase();
}

function isIdsOperator(ch: string): boolean {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return false;
  return cp >= 0x2ff0 && cp <= 0x2fff;
}

function decompositionLeaves(decomposition: string): string[] {
  const leaves: string[] = [];
  for (const ch of decomposition) {
    if (isIdsOperator(ch)) continue;
    if (ch === '？' || ch === '?') continue;
    leaves.push(ch);
  }
  return leaves;
}

function radicalsFor(meta: MetaLine): string[] {
  const leaves = decompositionLeaves(meta.decomposition);
  if (leaves.length > 0) return leaves;
  if (meta.radical.length > 0) return [meta.radical];
  return [meta.character];
}

function parseToneFromNumeric(numeric: string): number {
  const match = numeric.match(/([0-5])$/);
  if (!match || match[1] === undefined) return 0;
  const n = Number.parseInt(match[1], 10);
  if (n === 5) return 0; // 5 est parfois utilisé pour le ton neutre.
  return n;
}

function extractPinyinReadings(form: DrkForm): PinyinReading[] {
  const dia = form.transcriptions.pinyin.split(/\s+/).filter((s) => s.length > 0);
  const num = form.transcriptions.numeric.split(/\s+/).filter((s) => s.length > 0);
  const out: PinyinReading[] = [];
  const len = Math.min(dia.length, num.length);
  for (let i = 0; i < len; i++) {
    const syllable = dia[i];
    const tone = parseToneFromNumeric(num[i] ?? '');
    if (syllable === undefined) continue;
    out.push({ syllable, tone });
  }
  return out;
}

interface BuiltCharacter {
  id: string;
  hanzi: string;
  pinyin: PinyinReading[];
  translations: Record<string, string[]>;
  hsk_level: number;
  stroke_count: number;
  radicals: string[];
  frequency_rank?: number;
  tags: string[];
  stroke_data_ref: string;
  metadata: Record<string, unknown>;
}

interface BuiltWord {
  id: string;
  hanzi: string;
  pinyin: PinyinReading[];
  translations: Record<string, string[]>;
  hsk_level: number;
  character_refs: string[];
  examples: unknown[];
  tags: string[];
  metadata: Record<string, unknown>;
}

interface BuiltDeckItem {
  type: 'character' | 'word';
  ref: string;
}

interface BuiltDeck {
  id: string;
  name: string;
  description?: string;
  items: BuiltDeckItem[];
}

interface BuiltData {
  schema_version: string;
  characters: BuiltCharacter[];
  words: BuiltWord[];
  decks: BuiltDeck[];
}

function buildCharacters(
  drkEntries: DrkEntry[],
  meta: Map<string, MetaLine>,
): { characters: BuiltCharacter[]; missing: string[] } {
  // Collect every distinct hanzi appearing in any entry.
  const allHanzi = new Set<string>();
  for (const entry of drkEntries) {
    for (const ch of entry.simplified) allHanzi.add(ch);
  }

  // For each hanzi, gather pinyin readings (distinct by syllable+tone) and an
  // English meaning if a mono-character drkameleon entry exists.
  type Acc = {
    readings: Map<string, PinyinReading>;
    meaningsEn: string[];
    frequency?: number;
  };
  const acc = new Map<string, Acc>();
  for (const ch of allHanzi) acc.set(ch, { readings: new Map(), meaningsEn: [] });

  for (const entry of drkEntries) {
    const form = entry.forms[0];
    if (!form) continue;
    const readings = extractPinyinReadings(form);
    const isMono = [...entry.simplified].length === 1;

    // Align readings index-by-index with simplified characters when length matches.
    const hanziArr = [...entry.simplified];
    const aligned = readings.length === hanziArr.length;

    for (let i = 0; i < hanziArr.length; i++) {
      const ch = hanziArr[i];
      if (ch === undefined) continue;
      const bucket = acc.get(ch);
      if (!bucket) continue;
      if (aligned) {
        const r = readings[i];
        if (r) bucket.readings.set(`${r.syllable}|${r.tone}`, r);
      } else if (isMono && readings.length > 0) {
        const r = readings[0];
        if (r) bucket.readings.set(`${r.syllable}|${r.tone}`, r);
      }
      if (isMono) {
        if (form.meanings) bucket.meaningsEn = [...form.meanings];
        if (entry.frequency !== undefined) bucket.frequency = entry.frequency;
      }
    }
  }

  const missing: string[] = [];
  const characters: BuiltCharacter[] = [];
  const sortedHanzi = [...allHanzi].sort();
  for (const ch of sortedHanzi) {
    const m = meta.get(ch);
    if (!m) {
      missing.push(ch);
      continue;
    }
    const bucket = acc.get(ch);
    const readings = bucket ? [...bucket.readings.values()] : [];
    if (readings.length === 0) {
      // Fallback : we should always have at least one reading. Skip if not.
      missing.push(ch);
      continue;
    }
    // Fallback chain for English gloss:
    //   1. drkameleon mono-character entry meanings (richest).
    //   2. makemeahanzi `definition` (always present for HSK 1 chars).
    //   3. Placeholder, but signaled clearly.
    let englishGloss: string[] = [];
    if (bucket && bucket.meaningsEn.length > 0) {
      englishGloss = bucket.meaningsEn;
    } else if (m.definition.trim().length > 0) {
      englishGloss = [m.definition];
    } else {
      englishGloss = ['(traduction à compléter)'];
    }

    const character: BuiltCharacter = {
      id: `char_${toUpperHex(ch)}`,
      hanzi: ch,
      pinyin: readings,
      translations: { en: englishGloss },
      hsk_level: 1,
      stroke_count: m.stroke_count,
      radicals: radicalsFor(m),
      tags: [],
      stroke_data_ref: `makemeahanzi:${m.hex}`,
      metadata: {},
    };
    if (bucket?.frequency !== undefined) character.frequency_rank = bucket.frequency;
    characters.push(character);
  }
  return { characters, missing };
}

function buildWords(drkEntries: DrkEntry[]): BuiltWord[] {
  const words: BuiltWord[] = [];
  for (const entry of drkEntries) {
    const form = entry.forms[0];
    if (!form) continue;
    const readings = extractPinyinReadings(form);
    if (readings.length === 0) continue;
    const hanziArr = [...entry.simplified];
    const characterRefs = hanziArr.map((ch) => `char_${toUpperHex(ch)}`);
    const idHex = hanziArr.map(toLowerHex).join('');
    const word: BuiltWord = {
      id: `word_${idHex}`,
      hanzi: entry.simplified,
      pinyin: readings,
      translations:
        form.meanings && form.meanings.length > 0 ? { en: form.meanings } : { en: [''] },
      hsk_level: 1,
      character_refs: characterRefs,
      examples: [],
      tags: [],
      metadata: {},
    };
    words.push(word);
  }
  // Dedupe by id (in case drkameleon has duplicate entries for polyphones).
  const seen = new Map<string, BuiltWord>();
  for (const w of words) {
    if (!seen.has(w.id)) seen.set(w.id, w);
  }
  return [...seen.values()];
}

function buildDecks(characters: BuiltCharacter[], words: BuiltWord[]): BuiltDeck[] {
  return [
    {
      id: 'deck_hsk1_words',
      name: 'HSK 1 — vocabulaire',
      description: 'Vocabulaire HSK 3.0 niveau 1 (entrées drkameleon, 2026-03).',
      items: words.map((w) => ({ type: 'word' as const, ref: w.id })),
    },
    {
      id: 'deck_hsk1_characters',
      name: 'HSK 1 — caractères',
      description: 'Caractères distincts apparaissant dans le vocabulaire HSK 3.0 niveau 1.',
      items: characters.map((c) => ({ type: 'character' as const, ref: c.id })),
    },
  ];
}

function main(): void {
  console.log(`[build] lecture des sources vendorées (${SOURCES})`);
  const drkEntries = readDrkameleon();
  const meta = readMeta();
  console.log(`  drkameleon: ${drkEntries.length} entrées`);
  console.log(`  makemeahanzi meta: ${meta.size} hanzi`);

  const { characters, missing } = buildCharacters(drkEntries, meta);
  if (missing.length > 0) {
    console.warn(
      `  ⚠ ${missing.length} caractère(s) sans données complètes : ${missing.join(' ')}`,
    );
  }
  const words = buildWords(drkEntries);
  const decks = buildDecks(characters, words);

  const data: BuiltData = {
    schema_version: REFERENCE_SCHEMA_VERSION,
    characters,
    words,
    decks,
  };

  console.log(
    `[build] characters=${characters.length}  words=${words.length}  decks=${decks.length}`,
  );

  console.log('[build] validation Zod…');
  const parsed = referenceDataSchema.safeParse(data);
  if (!parsed.success) {
    console.error('❌ validation Zod échouée :');
    for (const issue of parsed.error.issues.slice(0, 10)) {
      console.error(`  - ${issue.path.join('.')} : ${issue.message}`);
    }
    if (parsed.error.issues.length > 10) {
      console.error(`  … et ${parsed.error.issues.length - 10} autres.`);
    }
    process.exit(1);
  }
  console.log('  ✓ conforme au schéma v1');

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(parsed.data, null, 2) + '\n');
  console.log(`[build] écrit : ${OUT_PATH}`);
}

main();
