/**
 * Jeton d'accès à l'API de sync (cf. RFC 0014), stocké localement et saisi une
 * fois par appareil. Lu à chaque requête par `RestSyncClient` (envoyé en
 * `Authorization: Bearer <token>`). localStorage peut être indisponible selon
 * le contexte navigateur → lectures/écritures tolérantes aux erreurs.
 */
export const SYNC_TOKEN_STORAGE_KEY = 'sinogrammes:sync:api-token';

export function readApiToken(): string {
  try {
    return window.localStorage.getItem(SYNC_TOKEN_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function writeApiToken(token: string): void {
  const normalized = token.trim();
  try {
    if (normalized.length > 0) {
      window.localStorage.setItem(SYNC_TOKEN_STORAGE_KEY, normalized);
    } else {
      window.localStorage.removeItem(SYNC_TOKEN_STORAGE_KEY);
    }
  } catch {
    // localStorage indisponible : on ignore silencieusement.
  }
}
