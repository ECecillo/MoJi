/**
 * Version SemVer du schéma de données de référence supporté par ce build.
 * Doit rester aligné sur `shared/schema/data-schema.v1.json` (cf. RFC 0004).
 */
export const REFERENCE_SCHEMA_VERSION = '1.0.0';

/**
 * Version SemVer du schéma de données utilisateur (progression, sessions).
 * Distinct du schéma de référence : les deux peuvent évoluer indépendamment.
 */
export const USER_SCHEMA_VERSION = '1.0.0';
