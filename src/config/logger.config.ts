import { pinoHttp } from 'pino-http';
import environment from './environment.config';

// Um log JSON por requisição (método, rota, status e tempo).
// O header Authorization sai como [Redacted], para o token não parar nos logs.
export function createHttpLogger(
  destination?: NodeJS.WritableStream,
  level: string = environment.logLevel,
) {
  return pinoHttp(
    {
      level,
      redact: ['req.headers.authorization'],
    },
    destination,
  );
}
