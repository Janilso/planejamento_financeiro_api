import { Writable } from 'node:stream';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createHttpLogger } from '../src/config/logger.config';

function memoryStream(lines: string[]) {
  return new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
}

describe('logs', () => {
  it('não registra o token nos logs', async () => {
    const lines: string[] = [];
    const app = express();
    app.use(createHttpLogger(memoryStream(lines), 'info'));
    app.get('/x', (_req, res) => {
      res.send('ok');
    });

    await request(app).get('/x').set('Authorization', 'segredo-123');

    const log = lines.join('');
    expect(log).toContain('[Redacted]');
    expect(log).not.toContain('segredo-123');
  });
});
