import { applyMigrations, MigrationError, type Migration } from './index';

describe('applyMigrations', () => {
  it('retourne le blob inchangé quand la version cible est déjà atteinte', () => {
    const blob = { schema_version: '1.0.0' as const, foo: 'bar' };
    const result = applyMigrations(blob, [], '1.0.0');
    expect(result).toEqual(blob);
  });

  it('applique une migration unique', () => {
    const migration: Migration = {
      from: '1.0.0',
      to: '1.1.0',
      migrate: (old) => ({ ...(old as object), schema_version: '1.1.0', added_field: true }),
    };
    const blob = { schema_version: '1.0.0' as const, payload: 42 };
    const result = applyMigrations(blob, [migration], '1.1.0');
    expect(result.schema_version).toBe('1.1.0');
    expect((result as Record<string, unknown>)['added_field']).toBe(true);
    expect((result as Record<string, unknown>)['payload']).toBe(42);
  });

  it('chaîne plusieurs migrations dans l’ordre des versions', () => {
    const m1: Migration = {
      from: '1.0.0',
      to: '1.1.0',
      migrate: (old) => ({ ...(old as object), schema_version: '1.1.0', a: 1 }),
    };
    const m2: Migration = {
      from: '1.1.0',
      to: '2.0.0',
      migrate: (old) => ({ ...(old as object), schema_version: '2.0.0', b: 2 }),
    };
    const result = applyMigrations({ schema_version: '1.0.0' as const }, [m1, m2], '2.0.0');
    expect(result.schema_version).toBe('2.0.0');
    expect((result as Record<string, unknown>)['a']).toBe(1);
    expect((result as Record<string, unknown>)['b']).toBe(2);
  });

  it('lève si aucun chemin de migration n’existe', () => {
    expect(() => applyMigrations({ schema_version: '1.0.0' as const }, [], '2.0.0')).toThrow(
      MigrationError,
    );
  });

  it('lève si une migration ne met pas à jour schema_version', () => {
    const buggy: Migration = {
      from: '1.0.0',
      to: '1.1.0',
      migrate: (old) => ({ ...(old as object), schema_version: '1.0.0' }),
    };
    expect(() => applyMigrations({ schema_version: '1.0.0' as const }, [buggy], '1.1.0')).toThrow(
      MigrationError,
    );
  });

  it('détecte une boucle de migration', () => {
    const loop: Migration = {
      from: '1.0.0',
      to: '1.0.0',
      migrate: (old) => ({ ...(old as object), schema_version: '1.0.0' }),
    };
    expect(() => applyMigrations({ schema_version: '1.0.0' as const }, [loop], '2.0.0')).toThrow(
      MigrationError,
    );
  });
});
