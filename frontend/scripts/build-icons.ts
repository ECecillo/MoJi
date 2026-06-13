/**
 * build-icons.ts — rastérise les icônes SVG de `public/icons/` en PNG aux tailles
 * exigées par les manifestes PWA (Chrome/Boox demandent des PNG 192 et 512).
 *
 * On réutilise le Chromium déjà installé pour Playwright (cf. RFC 0009) plutôt
 * que d'ajouter une dépendance de rastérisation : pas de réseau, sortie
 * déterministe. Lance via `make build-icons` (ou `npm run build:icons`).
 *
 * Sources (éditées à la main, source de vérité) :
 *   public/icons/icon.svg           → icon-192.png, icon-512.png
 *   public/icons/icon-maskable.svg  → icon-maskable-192.png, icon-maskable-512.png
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from '@playwright/test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ICONS_DIR = resolve(__dirname, '../public/icons');

interface IconJob {
  source: string;
  outBase: string;
}

const JOBS: IconJob[] = [
  { source: 'icon.svg', outBase: 'icon' },
  { source: 'icon-maskable.svg', outBase: 'icon-maskable' },
];

const SIZES = [192, 512];

async function main(): Promise<void> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const job of JOBS) {
      const svg = readFileSync(resolve(ICONS_DIR, job.source), 'utf-8');
      for (const size of SIZES) {
        const html = `<!doctype html><html><head><style>
          *{margin:0;padding:0}
          html,body{width:${size}px;height:${size}px;background:#fff}
          svg{display:block;width:${size}px;height:${size}px}
        </style></head><body>${svg}</body></html>`;
        await page.setViewportSize({ width: size, height: size });
        await page.setContent(html, { waitUntil: 'networkidle' });
        const out = resolve(ICONS_DIR, `${job.outBase}-${size}.png`);
        await page.screenshot({
          path: out,
          clip: { x: 0, y: 0, width: size, height: size },
        });
        console.log(`[icons] ${job.source} → ${job.outBase}-${size}.png`);
      }
    }
  } finally {
    await browser.close();
  }
}

void main();
