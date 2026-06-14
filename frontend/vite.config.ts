/// <reference types="vitest" />
import { createHash } from 'node:crypto';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), sinogrammesPwaPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    // En dev, le front (5173) et le back (8787) sont sur des origines distinctes.
    // On proxifie /api vers le backend pour que la sync fonctionne via `make dev`
    // (en prod, le binaire Go sert le front et l'API sur une seule origine).
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // Les tests de composants (App, Glossary) chargent et valident (Zod) tout le
    // jeu HSK 1+2 (~600 caractères / ~1250 mots) : lent sur un runner CI 2 cœurs.
    // Le défaut de 5 s y suffit pas → on relève le plafond (cf. RFC 0012).
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});

const PUBLIC_PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
];

function sinogrammesPwaPlugin(): Plugin {
  return {
    name: 'sinogrammes-pwa-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const bundleUrls = Object.values(bundle)
        .map((output) => `/${output.fileName}`)
        .filter((url) => url !== '/sw.js')
        .sort();
      const precacheUrls = Array.from(new Set([...PUBLIC_PRECACHE_URLS, ...bundleUrls]));
      const cacheVersion = createHash('sha256')
        .update(precacheUrls.join('\n'))
        .digest('hex')
        .slice(0, 12);

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: buildServiceWorkerSource(`sinogrammes-app-${cacheVersion}`, precacheUrls),
      });
    },
  };
}

function buildServiceWorkerSource(cacheName: string, precacheUrls: string[]): string {
  return `
const CACHE_NAME = ${JSON.stringify(cacheName)};
const PRECACHE_URLS = ${JSON.stringify(precacheUrls, null, 2)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(navigationFallback(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  await cacheResponse(request, response);
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    return response;
  } catch (_error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw _error;
  }
}

async function navigationFallback(request) {
  try {
    const response = await fetch(request);
    await cacheResponse(request, response);
    return response;
  } catch (_error) {
    return (await caches.match('/index.html')) ?? (await caches.match('/')) ?? Response.error();
  }
}

async function cacheResponse(request, response) {
  if (!response || !response.ok || !['basic', 'cors'].includes(response.type)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
}
`.trimStart();
}
