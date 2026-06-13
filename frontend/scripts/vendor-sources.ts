/**
 * vendor-sources.ts — rafraîchit les sources upstream vendorées dans `shared/data/sources/`.
 *
 * Étapes :
 *  1. Fetch des URLs upstream pinnées par SHA (cf. RFC 0008, RFC 0012).
 *  2. Sauvegarde verbatim des fichiers drkameleon `1.json` et `2.json` (dossier
 *     `inclusive`, cumulatif : `2.json` contient `1.json`).
 *  3. Dérivation des sous-ensembles makemeahanzi par niveau, avec pour chaque hanzi :
 *     { character, hex, stroke_count, radical, decomposition, definition, pinyin }.
 *     Le niveau d'un caractère est le plus bas où il apparaît : `makemeahanzi-hsk1-meta`
 *     couvre les chars de HSK 1, `makemeahanzi-hsk2-meta` les chars **exclusifs** à HSK 2.
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

// Niveaux HSK importés (dossier `inclusive` = cumulatif). Pour en ajouter un
// (HSK 3…), il suffit d'étendre ce tableau.
const LEVELS = [1, 2] as const;

function drkSource(level: number): UpstreamSource {
  const path = `wordlists/inclusive/new/${level}.json`;
  return {
    name: `drkameleon/complete-hsk-vocabulary (new/${level}.json)`,
    repo: 'drkameleon/complete-hsk-vocabulary',
    ref: DRKAMELEON_SHA,
    path,
    url: `https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/${DRKAMELEON_SHA}/${path}`,
  };
}

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

function distinctHanzi(drkText: string): Set<string> {
  const entries = JSON.parse(drkText) as DrkameleonEntry[];
  const set = new Set<string>();
  for (const entry of entries) {
    for (const ch of entry.simplified) set.add(ch);
  }
  return set;
}

function deriveMeta(
  chars: string[],
  dictByChar: Map<string, MmahDictLine>,
  strokeCountByChar: Map<string, number>,
): { derived: DerivedMeta[]; missing: string[] } {
  const missing: string[] = [];
  const derived: DerivedMeta[] = [];
  for (const ch of [...chars].sort()) {
    const dict = dictByChar.get(ch);
    const strokeCount = strokeCountByChar.get(ch);
    // stroke_count (graphics) est requis pour le tracé ; le reste est best-effort.
    if (strokeCount === undefined) {
      missing.push(ch);
      continue;
    }
    derived.push({
      character: ch,
      hex: toHex(ch),
      stroke_count: strokeCount,
      radical: dict?.radical ?? '',
      decomposition: dict?.decomposition ?? '',
      definition: dict?.definition ?? '',
      pinyin: dict?.pinyin ?? [],
    });
  }
  return { derived, missing };
}

async function main(): Promise<void> {
  mkdirSync(SHARED_SOURCES, { recursive: true });

  // 1. drkameleon par niveau (dossier inclusive, cumulatif) — verbatim.
  const drkLevels: { level: number; source: UpstreamSource; text: string; chars: Set<string> }[] =
    [];
  for (const level of LEVELS) {
    const source = drkSource(level);
    const text = await fetchText(source.url, source.name);
    const path = resolve(SHARED_SOURCES, `drkameleon-hsk30-l${level}.json`);
    writeFileSync(path, text);
    console.log(`  → ${path} (${text.length} bytes)`);
    drkLevels.push({ level, source, text, chars: distinctHanzi(text) });
  }

  // Union de tous les hanzi (le niveau le plus haut couvre les autres).
  const allChars = new Set<string>();
  for (const { chars } of drkLevels) {
    for (const ch of chars) allChars.add(ch);
  }
  console.log(`  → ${allChars.size} hanzi distincts (tous niveaux)`);

  // 2. makemeahanzi dictionary.txt + graphics.txt, indexés sur l'union.
  const dictText = await fetchText(MMAH_DICT.url, MMAH_DICT.name);
  const dictByChar = new Map<string, MmahDictLine>();
  for (const obj of parseJsonl<MmahDictLine>(dictText)) {
    if (allChars.has(obj.character)) dictByChar.set(obj.character, obj);
  }
  const graphText = await fetchText(MMAH_GRAPH.url, MMAH_GRAPH.name);
  const strokeCountByChar = new Map<string, number>();
  for (const obj of parseJsonl<MmahGraphLine>(graphText)) {
    if (allChars.has(obj.character)) strokeCountByChar.set(obj.character, obj.strokes.length);
  }

  // 3. Dérive un meta par niveau : chaque caractère est attribué au plus bas
  //    niveau où il apparaît (différence ensembliste avec les niveaux inférieurs).
  const provenanceSources: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const { level, source, text, chars } of drkLevels) {
    const exclusive = [...chars].filter((ch) => !seen.has(ch));
    for (const ch of chars) seen.add(ch);

    const { derived, missing } = deriveMeta(exclusive, dictByChar, strokeCountByChar);
    if (missing.length > 0) {
      console.warn(`  ⚠ HSK ${level} — sans stroke_count makemeahanzi : ${missing.join(' ')}`);
    }
    const metaName = `makemeahanzi-hsk${level}-meta.jsonl`;
    const metaText = derived.map((m) => JSON.stringify(m)).join('\n') + '\n';
    writeFileSync(resolve(SHARED_SOURCES, metaName), metaText);
    console.log(`  → ${metaName} (${derived.length} lignes, HSK ${level} exclusif)`);

    provenanceSources.push({
      ...source,
      vendored_as: `drkameleon-hsk30-l${level}.json`,
      sha256: sha256(text),
      bytes: text.length,
    });
    provenanceSources.push({
      name: `derived: ${metaName}`,
      sha256: sha256(metaText),
      bytes: metaText.length,
      entries: derived.length,
      missing,
    });
  }

  // 4. Provenance.
  const provenance = {
    generated_at: new Date().toISOString(),
    note: 'Fichier régénéré par frontend/scripts/vendor-sources.ts. Ne pas éditer à la main.',
    sources: [
      ...provenanceSources,
      {
        ...MMAH_DICT,
        derived_into:
          'makemeahanzi-hsk{1,2}-meta.jsonl (champs: character, hex, radical, decomposition, definition, pinyin)',
        upstream_sha256: sha256(dictText),
        upstream_bytes: dictText.length,
      },
      {
        ...MMAH_GRAPH,
        derived_into: 'makemeahanzi-hsk{1,2}-meta.jsonl (champ: stroke_count)',
        upstream_sha256: sha256(graphText),
        upstream_bytes: graphText.length,
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
