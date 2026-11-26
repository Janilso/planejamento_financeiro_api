import { LoginTicket, OAuth2Client, TokenPayload } from 'google-auth-library';
import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import request from 'supertest';
import { vi } from 'vitest';
import app from '../src/app';
import { environment, TokenConfig } from '../src/config';
import { openApiSpec } from '../src/docs/openapi';

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

// Confere se a resposta real segue o schema que o spec documenta para
// aquele método, caminho e status.
const ajv = new Ajv2020({ strict: false, allErrors: true });
addFormats(ajv);
ajv.addSchema({ ...openApiSpec, $id: 'openapi' });

const pointer = (...parts: string[]) =>
  parts.map((p) => p.replace(/~/g, '~0').replace(/\//g, '~1')).join('/');

export function expectMatchesSpec(
  res: { status: number; body: unknown },
  method: string,
  path: string,
) {
  const operation = openApiSpec.paths[path]?.[method] as
    { responses: Record<string, { $ref?: string }> } | undefined;
  const documented = operation?.responses[String(res.status)];
  if (!documented) {
    throw new Error(
      `${method.toUpperCase()} ${path} ${res.status} não está no spec`,
    );
  }
  const base = documented.$ref
    ? documented.$ref.slice(2)
    : pointer('paths', path, method, 'responses', String(res.status));
  if (res.status === 204) return;

  const validate = ajv.getSchema(
    `openapi#/${base}/${pointer('content', 'application/json', 'schema')}`,
  );
  if (!validate) throw new Error(`sem schema para ${base}`);
  if (!validate(res.body)) {
    throw new Error(
      `${method.toUpperCase()} ${path} ${res.status} fora do spec: ${ajv.errorsText(validate.errors)}`,
    );
  }
}
