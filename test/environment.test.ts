import { describe, expect, it } from 'vitest';
import { loadEnvironment } from '../src/config/environment.config';

const minimo = {
  MONGO_URI: 'mongodb://x',
  GOOGLE_CLIENT_ID: 'c',
  JWT_SECRET_KEY: 'a',
  JWT_REFRESH_SECRET_KEY: 'b',
};

describe('loadEnvironment', () => {
  it('aponta as variáveis obrigatórias que faltam', () => {
    expect(() => loadEnvironment({})).toThrow(
      /MONGO_URI[\s\S]*GOOGLE_CLIENT_ID[\s\S]*JWT_SECRET_KEY[\s\S]*JWT_REFRESH_SECRET_KEY/,
    );
  });

  it('aplica os padrões', () => {
    expect(loadEnvironment(minimo)).toMatchObject({
      port: 8080,
      nodeEnv: 'development',
      mongoUri: 'mongodb://x',
      googleClientId: 'c',
      jwtSecretKey: 'a',
      jwtRefreshSecretKey: 'b',
    });
    expect(loadEnvironment({ ...minimo, PORT: '3000' }).port).toBe(3000);
  });
});
