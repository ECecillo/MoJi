/**
 * build-docs-index.ts — produit `docs/index.html`, un carnet de bord HTML
 * autonome lisible directement dans un navigateur (file://).
 *
 * Lit :
 *   - BRIEF.md
 *   - docs/handoff/CURRENT_STATE.md
 *   - docs/rfc/*.md (sauf README)
 *   - docs/journal/*.md (sauf README)
 *
 * Sortie : `docs/index.html` — un seul fichier, sans dépendance runtime,
 * styles et scripts inlinés.
 *
 * À rejouer après toute modification d'un de ces fichiers (`make docs` ou
 * `npm run build:docs`).
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../..');
const DOCS = resolve(REPO_ROOT, 'docs');
const OUT = resolve(DOCS, 'index.html');

interface DocMeta {
  title: string;
  bullets: Record<string, string>;
}

function readDoc(path: string): { raw: string; meta: DocMeta } {
  const raw = readFileSync(path, 'utf-8');
  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = (titleMatch?.[1] ?? path).trim();
  const bullets: Record<string, string> = {};
  const re = /^[-*]\s+\*\*([^*]+)\*\*\s*:\s*(.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    bullets[m[1]!.toLowerCase().trim()] = m[2]!.trim();
  }
  return { raw, meta: { title, bullets } };
}

function listMarkdown(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .sort();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Réécrit les liens markdown internes (vers d'autres fichiers .md) en ancres
 * vers les sections correspondantes dans l'index.
 */
function rewriteLinks(html: string): string {
  return html
    .replace(/href="(?:\.\.\/)*rfc\/(\d{4})-[^"]*\.md(?:#[^"]*)?"/g, 'href="#rfc-$1"')
    .replace(/href="(\d{4})-[^"]*\.md(?:#[^"]*)?"/g, 'href="#rfc-$1"')
    .replace(
      /href="(?:\.\.\/)*journal\/(\d{4}-\d{2}-\d{2}-[^"]*)\.md(?:#[^"]*)?"/g,
      'href="#journal-$1"',
    )
    .replace(/href="(\d{4}-\d{2}-\d{2}-[^"]*)\.md(?:#[^"]*)?"/g, 'href="#journal-$1"')
    .replace(/href="(?:\.\.\/)*handoff\/CURRENT_STATE\.md(?:#[^"]*)?"/g, 'href="#etat"')
    .replace(/href="CURRENT_STATE\.md(?:#[^"]*)?"/g, 'href="#etat"')
    .replace(/href="(?:\.\.\/)*BRIEF\.md(?:#[^"]*)?"/g, 'href="#brief"')
    .replace(/href="BRIEF\.md(?:#[^"]*)?"/g, 'href="#brief"');
}

function render(raw: string): string {
  const html = marked.parse(raw, { gfm: true, async: false }) as string;
  return rewriteLinks(html);
}

const CSS = `
:root {
  --ink: #111;
  --ink-muted: #555;
  --ink-faint: #888;
  --paper: #fdfdfd;
  --paper-muted: #f3f3f3;
  --border: #d4d4d4;
  --link: #2255aa;
  --accepte: #d4edda;
  --brouillon: #fff3cd;
  --remplace: #f8d7da;
  --abandonne: #e2e3e5;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
  background: var(--paper);
  color: var(--ink);
  line-height: 1.65;
  padding-bottom: 4rem;
}
.wrap { max-width: 60rem; margin: 0 auto; padding: 0 1.5rem; }
nav.topnav {
  position: sticky;
  top: 0;
  background: var(--paper);
  border-bottom: 1px solid var(--border);
  padding: 0.75rem 0;
  z-index: 10;
}
nav.topnav .wrap { display: flex; gap: 1.5rem; flex-wrap: wrap; }
nav.topnav a {
  text-decoration: none;
  color: var(--ink);
  font-weight: 600;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 0.95rem;
}
nav.topnav a:hover { text-decoration: underline; }
header.hero {
  border-bottom: 1px solid var(--border);
  padding: 2rem 0 1.5rem;
  margin-bottom: 1rem;
}
header.hero h1 {
  margin: 0 0 0.5rem;
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 1.8rem;
}
h1, h2, h3, h4 {
  font-family: ui-sans-serif, system-ui, sans-serif;
  line-height: 1.3;
}
h2 { margin: 3rem 0 1rem; padding-bottom: 0.3rem; border-bottom: 2px solid var(--ink); }
h3 { margin: 1.5rem 0 0.75rem; }
section { margin-bottom: 3rem; scroll-margin-top: 4rem; }
details { scroll-margin-top: 4rem; }
a { color: var(--link); }
.meta { color: var(--ink-muted); font-size: 0.9rem; }
.hint { color: var(--ink-faint); font-size: 0.85rem; font-style: italic; }
code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  background: var(--paper-muted);
  padding: 0.1em 0.35em;
  font-size: 0.9em;
  border-radius: 3px;
}
pre {
  background: var(--paper-muted);
  padding: 1rem;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-size: 0.85rem;
  line-height: 1.5;
}
pre code { background: none; padding: 0; font-size: inherit; }
blockquote {
  border-left: 3px solid var(--ink-faint);
  margin: 1rem 0;
  padding: 0.2rem 1rem;
  color: var(--ink-muted);
  font-style: italic;
}
table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.92rem; }
th, td { border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; vertical-align: top; }
th { background: var(--paper-muted); font-family: ui-sans-serif, system-ui, sans-serif; }
details {
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 0.5rem 1rem;
  margin: 0.5rem 0;
  background: var(--paper);
}
details > summary {
  cursor: pointer;
  font-weight: 600;
  font-family: ui-sans-serif, system-ui, sans-serif;
  padding: 0.5rem 0;
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
details > summary::-webkit-details-marker { display: none; }
details > summary::before {
  content: '▸';
  color: var(--ink-faint);
  font-size: 0.8rem;
  flex-shrink: 0;
}
details[open] > summary::before { content: '▾'; }
details[open] > summary { border-bottom: 1px solid var(--border); margin-bottom: 0.75rem; }
details .content > :first-child { margin-top: 0; }
details .content > :last-child { margin-bottom: 0; }
.status {
  display: inline-block;
  padding: 0.1em 0.6em;
  border-radius: 3px;
  font-size: 0.8rem;
  font-weight: 600;
  font-family: ui-sans-serif, system-ui, sans-serif;
}
.status-Accepté { background: var(--accepte); }
.status-Brouillon { background: var(--brouillon); }
.status-Remplacé { background: var(--remplace); }
.status-Abandonné { background: var(--abandonne); }
footer { margin-top: 4rem; padding-top: 1rem; border-top: 1px solid var(--border); }

@media (prefers-color-scheme: dark) {
  :root {
    --ink: #e6e6e6;
    --ink-muted: #a0a0a0;
    --ink-faint: #707070;
    --paper: #181818;
    --paper-muted: #242424;
    --border: #3a3a3a;
    --link: #6aa7ff;
    --accepte: #1f4f2f;
    --brouillon: #5a4720;
    --remplace: #5a2a2a;
    --abandonne: #3a3a3a;
  }
}
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
}
@media print {
  nav.topnav { display: none; }
  details { border: none; padding: 0; }
  details > summary { font-size: 1.1rem; margin: 1rem 0 0.5rem; }
  details > summary::before { content: ''; }
  details:not([open]) { display: none; }
}
`;

const JS = `
function openAndScroll() {
  var hash = location.hash;
  if (!hash) return;
  try {
    var target = document.querySelector(hash);
    if (!target) return;
    var el = target;
    while (el) {
      if (el.tagName === 'DETAILS') el.open = true;
      el = el.parentElement;
    }
    target.scrollIntoView();
  } catch (_e) {}
}
window.addEventListener('hashchange', openAndScroll);
window.addEventListener('load', openAndScroll);
`;

const briefDoc = readDoc(resolve(REPO_ROOT, 'BRIEF.md'));
const stateDoc = readDoc(resolve(DOCS, 'handoff/CURRENT_STATE.md'));
const rfcFiles = listMarkdown(resolve(DOCS, 'rfc'));
const journalFiles = listMarkdown(resolve(DOCS, 'journal'));

const rfcs = rfcFiles.map((file) => ({
  file,
  num: file.match(/^(\d{4})/)?.[1] ?? '?',
  ...readDoc(resolve(DOCS, 'rfc', file)),
}));

// Journal: tri par nom de fichier décroissant (les noms commencent par AAAA-MM-JJ).
const journal = [...journalFiles]
  .sort()
  .reverse()
  .map((file) => ({
    file,
    slug: file.replace(/\.md$/, ''),
    ...readDoc(resolve(DOCS, 'journal', file)),
  }));

const generatedAt = new Date().toISOString().slice(0, 16).replace('T', ' ');

const rfcRows = rfcs
  .map((r) => {
    const status = r.meta.bullets['statut'] ?? '?';
    const date = r.meta.bullets['date'] ?? '?';
    const shortTitle = r.meta.title.replace(/^RFC \d+\s*[—-]\s*/, '');
    return `<tr>
  <td><a href="#rfc-${r.num}">${r.num}</a></td>
  <td><a href="#rfc-${r.num}">${escapeHtml(shortTitle)}</a></td>
  <td><span class="status status-${escapeHtml(status)}">${escapeHtml(status)}</span></td>
  <td>${escapeHtml(date)}</td>
</tr>`;
  })
  .join('\n');

const rfcSections = rfcs
  .map((r) => {
    const status = r.meta.bullets['statut'] ?? '?';
    const date = r.meta.bullets['date'] ?? '?';
    return `<details id="rfc-${r.num}">
  <summary>${escapeHtml(r.meta.title)}<span class="meta">${escapeHtml(date)} · <span class="status status-${escapeHtml(status)}">${escapeHtml(status)}</span></span></summary>
  <div class="content">${render(r.raw)}</div>
</details>`;
  })
  .join('\n');

const journalSections = journal
  .map(
    (j) => `<details id="journal-${escapeHtml(j.slug)}">
  <summary>${escapeHtml(j.meta.title)}</summary>
  <div class="content">${render(j.raw)}</div>
</details>`,
  )
  .join('\n');

const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Sinogrammes — Carnet de bord</title>
<style>${CSS}</style>
</head>
<body>
<nav class="topnav"><div class="wrap">
  <a href="#etat">État courant</a>
  <a href="#rfc">RFC (${rfcs.length})</a>
  <a href="#journal">Journal (${journal.length})</a>
  <a href="#brief">Brief</a>
</div></nav>

<div class="wrap">
<header class="hero">
  <h1>Sinogrammes — Carnet de bord</h1>
  <p class="meta">Index généré le ${generatedAt}. ${rfcs.length} RFC · ${journal.length} entrées de journal.</p>
  <p class="hint">Toutes les sections sont collapsables. Cliquez sur une ligne ou un lien interne pour ouvrir et défiler.</p>
</header>

<section id="etat">
<h2>État courant</h2>
<div class="content">${render(stateDoc.raw)}</div>
</section>

<section id="rfc">
<h2>RFC — décisions structurantes</h2>
<table>
<thead><tr><th>#</th><th>Titre</th><th>Statut</th><th>Date</th></tr></thead>
<tbody>${rfcRows}</tbody>
</table>
${rfcSections}
</section>

<section id="journal">
<h2>Journal de bord</h2>
${journalSections}
</section>

<section id="brief">
<h2>Brief de cadrage initial</h2>
<details>
  <summary>Lire le brief intégral <span class="meta">figé, source de vérité de la vision</span></summary>
  <div class="content">${render(briefDoc.raw)}</div>
</details>
</section>

<footer>
<p class="meta">Sinogrammes · projet personnel d'apprentissage des sinogrammes HSK 1 · index généré le ${generatedAt} par <code>make docs</code>.</p>
</footer>
</div>

<script>${JS}</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`[docs] ${OUT} régénéré (${(html.length / 1024).toFixed(1)} KB)`);
console.log(
  `       ${rfcs.length} RFC · ${journal.length} entrées de journal · état + brief inclus`,
);
