import '@testing-library/jest-dom/vitest';

// Node 25+ exposes a native (gated) Web Storage API. Its global `Storage`
// shadows jsdom's own implementation, so jsdom does not install
// `window.localStorage` and it ends up undefined under Node ≥ 25. We provide a
// minimal in-memory Storage shim, only when one is missing, so the test suite
// is independent of the Node/jsdom interaction. No-op under Node 24 where jsdom
// already provides a working localStorage.
function installMemoryStorage(key: 'localStorage' | 'sessionStorage'): void {
  if (typeof window !== 'undefined' && window[key]) return;

  const store = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(name) {
      return store.has(name) ? (store.get(name) as string) : null;
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(name) {
      store.delete(name);
    },
    setItem(name, value) {
      store.set(name, String(value));
    },
  };

  Object.defineProperty(window, key, { value: storage, configurable: true });
}

installMemoryStorage('localStorage');
installMemoryStorage('sessionStorage');
