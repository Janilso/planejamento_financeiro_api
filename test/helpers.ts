import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import request from 'supertest';
import { vi } from 'vitest';
import app from '../src/app';
import { environment, TokenConfig } from '../src/config';

export const api = request(app);

export function makeToken(userId: string): string {
  return new TokenConfig().generateToken(
    { id: userId },
    environment.jwtSecretKey,
    '1h',
  );
}

export function mockGoogle(payload: Partial<TokenPayload> | Error): void {
  const ticket =
    payload instanceof Error
      ? undefined
      : new LoginTicket('test', {
          iss: 'https://accounts.google.com',
          aud: 'test-client-id',
          sub: '1',
          iat: 0,
          exp: 0,
          ...payload,
        });

  vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation(
    async () => {
      if (payload instanceof Error) throw payload;
      return ticket;
    },
  );
}

export function balancePayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Aluguel',
    value: 1500,
    type: 'expenses',
    installment: 1,
    date: '2026-01-15T12:00:00.000Z',
    realized: true,
    ...overrides,
  };
}
