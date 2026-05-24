/**
 * vendor-sources.ts — rafraîchit les sources upstream vendorées dans `shared/data/sources/`.
 *
 * Étapes :
 *  1. Fetch des URLs upstream pinnées par SHA (cf. RFC 0008).
 *  2. Sauvegarde verbatim du fichier drkameleon `1.json`.
 *  3. Filtrage / dérivation du sous-ensemble makemeahanzi (300 hanzi HSK 1) avec
 *     pour chacun : { character, hex, stroke_count, radical, decomposition }.
 *  4. Mise à jour de `_provenance.json` (URLs, SHAs, dates, SHA-256 des fichiers).
 *
 * À rejouer rarement, **manuellement**, quand on veut bumper les SHAs upstream.
 * Aucun appel réseau dans `build-hsk1-data.ts` ; uniquement ici.
 */

import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const SHARED_SOURCES = resolve(REPO_ROOT, 'shared/data/sources');

interface UpstreamSource {
  name: string;
  repo: string;
  ref: string;
  path: string;
  url: string;
}

const DRKAMELEON_SHA = '7ac65bf1a6387d35f1ade478906172a19311c7f9';
const MMAH_SHA = 'bddc96d41bef78427ed0e034e9f7e31d71fd1b92';

const DRKAMELEON: UpstreamSource = {
  name: 'drkameleon/complete-hsk-vocabulary',
  repo: 'drkameleon/complete-hsk-vocabulary',
  ref: DRKAMELEON_SHA,
  path: 'wordlists/inclusive/new/1.json',
  url: `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/${DRKAMELEON_SHA}/wordlists/inclusive/new/1.json`,
};

const MMAH_DICT: UpstreamSource = {
  name: 'skishore/makemeahanzi (dictionary.txt)',
  repo: 'skishore/makemeahanzi',
  ref: MMAH_SHA,
  path: 'dictionary.txt',
  url: `https://raw.githubusercontent.com/skishore/makemeahanzi/${MMAH_SHA}/dictionary.txt`,
};

const MMAH_GRAPH: UpstreamSource = {
  name: 'skishore/makemeahanzi (graphics.txt)',
  repo: 'skishore/makemeahanzi',
  ref: MMAH_SHA,
  path: 'graphics.txt',
  url: `https://raw.githubusercontent.com/skishore/makemeahanzi/${MMAH_SHA}/graphics.txt`,
};

interface DrkameleonEntry {
  simplified: string;
}

interface MmahDictLine {
  character: string;
  radical?: string;
  decomposition?: string;
  definition?: string;
  pinyin?: string[];
}

interface MmahGraphLine {
  character: string;
  strokes: string[];
}

interface DerivedMeta {
  character: string;
  hex: string;
  stroke_count: number;
  radical: string;
  decomposition: string;
  definition: string;
  pinyin: string[];
}

async function fetchText(url: string, label: string): Promise<string> {
  console.log(`[fetch] ${label}\n        ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} sur ${url}`);
  }
  return await res.text();
}

function sha256(buf: Buffer | string): string {
  return createHash('sha256').update(buf).digest('hex');
}

function toHex(ch: string): string {
  const cp = ch.codePointAt(0);
  if (cp === undefined) {
    throw new Error(`code point introuvable pour ${JSON.stringify(ch)}`);
  }
  return cp.toString(16).toUpperCase().padStart(4, '0');
}

function parseJsonl<T>(text: string): T[] {
  const out: T[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.length === 0) continue;
    out.push(JSON.parse(line) as T);
  }
  return out;
}

async function main(): Promise<void> {
  mkdirSync(SHARED_SOURCES, { recursive: true });

  // 1. drkameleon HSK 3.0 level 1 — verbatim
  const drkText = await fetchText(DRKAMELEON.url, DRKAMELEON.name);
  const drkPath = resolve(SHARED_SOURCES, 'drkameleon-hsk30-l1.json');
  writeFileSync(drkPath, drkText);
  console.log(`  → ${drkPath} (${drkText.length} bytes)`);

  // 2. Distinct hanzi from drkameleon
  const drkEntries = JSON.parse(drkText) as DrkameleonEntry[];
  const hanziSet = new Set<string>();
  for (const entry of drkEntries) {
    for (const ch of entry.simplified) {
      hanziSet.add(ch);
    }
  }
  console.log(`  → ${hanziSet.size} hanzi distincts`);

  // 3. makemeahanzi dictionary.txt — index by character
  const dictText = await fetchText(MMAH_DICT.url, MMAH_DICT.name);
  const dictByChar = new Map<string, MmahDictLine>();
  for (const obj of parseJsonl<MmahDictLine>(dictText)) {
    if (hanziSet.has(obj.character)) dictByChar.set(obj.character, obj);
  }

  // 4. makemeahanzi graphics.txt — stroke counts only
  const graphText = await fetchText(MMAH_GRAPH.url, MMAH_GRAPH.name);
  const strokeCountByChar = new Map<string, number>();
  for (const obj of parseJsonl<MmahGraphLine>(graphText)) {
    if (hanziSet.has(obj.character)) {
      strokeCountByChar.set(obj.character, obj.strokes.length);
    }
  }

  // 5. Derive subset
  const sortedHanzi = [...hanziSet].sort();
  const missing: string[] = [];
  const derived: DerivedMeta[] = [];
  for (const ch of sortedHanzi) {
    const dict = dictByChar.get(ch);
    const strokeCount = strokeCountByChar.get(ch);
    if (!dict || strokeCount === undefined) {
      missing.push(ch);
      continue;
    }
    derived.push({
      character: ch,
      hex: toHex(ch),
      stroke_count: strokeCount,
      radical: dict.radical ?? '',
      decomposition: dict.decomposition ?? '',
      definition: dict.definition ?? '',
      pinyin: dict.pinyin ?? [],
    });
  }
  if (missing.length > 0) {
    console.warn(`  ⚠ caractères sans données makemeahanzi : ${missing.join(' ')}`);
  }

  const metaPath = resolve(SHARED_SOURCES, 'makemeahanzi-hsk1-meta.jsonl');
  const metaText = derived.map((m) => JSON.stringify(m)).join('\n') + '\n';
  writeFileSync(metaPath, metaText);
  console.log(`  → ${metaPath} (${derived.length} lignes, ${metaText.length} bytes)`);

  // 6. Provenance
  const provenance = {
    generated_at: new Date().toISOString(),
    note: 'Fichier régénéré par frontend/scripts/vendor-sources.ts. Ne pas éditer à la main.',
    sources: [
      {
        ...DRKAMELEON,
        vendored_as: 'drkameleon-hsk30-l1.json',
        sha256: sha256(drkText),
        bytes: drkText.length,
      },
      {
        ...MMAH_DICT,
        derived_into:
          'makemeahanzi-hsk1-meta.jsonl (champs: character, hex, radical, decomposition, definition, pinyin)',
        upstream_sha256: sha256(dictText),
        upstream_bytes: dictText.length,
      },
      {
        ...MMAH_GRAPH,
        derived_into: 'makemeahanzi-hsk1-meta.jsonl (champ: stroke_count)',
        upstream_sha256: sha256(graphText),
        upstream_bytes: graphText.length,
      },
      {
        name: 'derived: makemeahanzi-hsk1-meta.jsonl',
        sha256: sha256(metaText),
        bytes: metaText.length,
        entries: derived.length,
        missing,
      },
    ],
  };
  const provPath = resolve(SHARED_SOURCES, '_provenance.json');
  writeFileSync(provPath, JSON.stringify(provenance, null, 2) + '\n');
  console.log(`  → ${provPath}`);

  console.log('OK.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
