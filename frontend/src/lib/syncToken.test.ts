import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readApiToken, writeApiToken, SYNC_TOKEN_STORAGE_KEY } from './syncToken';

describe('syncToken', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => window.localStorage.clear());

  it('lit une chaîne vide quand rien n’est stocké', () => {
    expect(readApiToken()).toBe('');
  });

  it('écrit puis relit le jeton (trimmé)', () => {
    writeApiToken('  s3cret  ');
    expect(readApiToken()).toBe('s3cret');
    expect(window.localStorage.getItem(SYNC_TOKEN_STORAGE_KEY)).toBe('s3cret');
  });

  it('un jeton vide supprime l’entrée', () => {
    writeApiToken('abc');
    writeApiToken('   ');
    expect(readApiToken()).toBe('');
    expect(window.localStorage.getItem(SYNC_TOKEN_STORAGE_KEY)).toBeNull();
  });
});
