import http from 'node:http';
import type { AddressInfo } from 'node:net';
import zlib from 'node:zlib';
import { describe, expect, it } from 'vitest';
import app from '../../src/app';
import { BalanceModel } from '../../src/models';
import BalanceService from '../../src/services/balance.service';
import { makeToken } from '../helpers';
import { gerarLancamentos, ITENS_ESPERADOS, VOLUMES } from './volumes';

const HOJE = new Date('2026-11-25T15:00:00Z');
const USUARIO = 'usuario-perf';
const LIMITE_MS = 200;
const LIMITE_BYTES = 100 * 1024;

export type Medida = {
  medianaMs: number;
  p90Ms: number;
  bytes: number;
  corpo: Uint8Array;
};

function pedir(
  porta: number,
  caminho: string,
  token: string,
  gzip: boolean,
): Promise<{ ms: number; corpo: Uint8Array; status: number }> {
  return new Promise((resolve, reject) => {
    const inicio = performance.now();
    const req = http.request(
      {
        port: porta,
        path: caminho,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(gzip ? { 'Accept-Encoding': 'gzip' } : {}),
        },
      },
      (res) => {
        const partes: Buffer[] = [];
        res.on('data', (p: Buffer) => partes.push(p));
        res.on('end', () =>
          resolve({
            ms: performance.now() - inicio,
            corpo: Buffer.concat(partes),
            status: res.statusCode ?? 0,
          }),
        );
      },
    );
    req.on('error', reject);
    req.end();
  });
}

// 3 requisições de aquecimento e 20 medidas. Os bytes são os crus da rede: o
// node:http não descomprime.
export async function medirRota(
  caminho: string,
  token: string,
  gzip: boolean,
): Promise<Medida> {
  const server = app.listen(0);
  try {
    const porta = (server.address() as AddressInfo).port;
    for (let i = 0; i < 3; i++) await pedir(porta, caminho, token, gzip);
    const tempos: number[] = [];
    let ultima: Uint8Array = new Uint8Array();
    for (let i = 0; i < 20; i++) {
      const r = await pedir(porta, caminho, token, gzip);
      expect(r.status).toBe(200);
      tempos.push(r.ms);
      ultima = r.corpo;
    }
    tempos.sort((a, b) => a - b);
    return {
      medianaMs: (tempos[9] + tempos[10]) / 2,
      p90Ms: tempos[17],
      bytes: ultima.length,
      corpo: ultima,
    };
  } finally {
    await new Promise((fim) => server.close(fim));
  }
}

const kb = (bytes: number) => `${Math.round(bytes / 1024)} KB`;

describe('GET /balances com histórico grande', () => {
  for (const volume of VOLUMES) {
    it(`${volume}`, async () => {
      const service = new BalanceService(BalanceModel);
      for (const l of gerarLancamentos(volume, HOJE)) {
        await service.create(USUARIO, l);
      }
      const token = makeToken(USUARIO);

      const semGzip = await medirRota('/balances', token, false);
      const comGzip = await medirRota('/balances', token, true);

      const meses = JSON.parse(Buffer.from(semGzip.corpo).toString('utf8')) as Record<
        string,
        { gains: unknown[]; expenses: unknown[] }
      >;
      const itens = Object.values(meses).reduce(
        (soma, m) => soma + m.gains.length + m.expenses.length,
        0,
      );
      expect(itens).toBe(ITENS_ESPERADOS[volume]);

      const gzipEstimado = zlib.gzipSync(semGzip.corpo).length;
      const ok = semGzip.medianaMs < LIMITE_MS && comGzip.bytes <= LIMITE_BYTES;
      process.stdout.write(
        `\n${volume} | /balances | ${itens} itens | mediana ${semGzip.medianaMs.toFixed(0)} ms | ` +
          `p90 ${semGzip.p90Ms.toFixed(0)} ms | rede ${kb(comGzip.bytes)} (gzip pedido) | ` +
          `estimativa gzip ${kb(gzipEstimado)} | ${ok ? '✅' : '❌'}\n`,
      );
    });
  }
});
