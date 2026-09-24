import { getEnvDisplay } from './env';

describe('getEnvDisplay', () => {
  it('maps the deployed environment names to their labels', () => {
    expect(getEnvDisplay('local')).toEqual({ key: 'local', label: 'LOCAL' });
    expect(getEnvDisplay('develop')).toEqual({ key: 'develop', label: 'DESARROLLO' });
    expect(getEnvDisplay('staging')).toEqual({ key: 'staging', label: 'STAGING' });
    expect(getEnvDisplay('production')).toEqual({ key: 'production', label: 'PRODUCCIÓN' });
  });

  it('accepts common synonyms and mixed case', () => {
    expect(getEnvDisplay('PROD').key).toBe('production');
    expect(getEnvDisplay('Desarrollo').key).toBe('develop');
    expect(getEnvDisplay('preproduccion').key).toBe('staging');
    expect(getEnvDisplay('LocalHost').key).toBe('local');
  });

  it('normalizes separators and surrounding spaces', () => {
    expect(getEnvDisplay(' pre_produccion ').key).toBe('staging');
    expect(getEnvDisplay('  app_env-name  ').key).toBe('unknown');
  });

  it('returns unknown for missing or unrecognized values', () => {
    expect(getEnvDisplay(undefined)).toEqual({ key: 'unknown', label: 'SIN DEFINIR' });
    expect(getEnvDisplay('')).toEqual({ key: 'unknown', label: 'SIN DEFINIR' });
    expect(getEnvDisplay('ENV_NAME_PLACEHOLDER')).toEqual({
      key: 'unknown',
      label: 'SIN DEFINIR'
    });
  });
});
