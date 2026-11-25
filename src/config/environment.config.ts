import dotenv from 'dotenv';
import z from 'zod';

dotenv.config();

const obrigatoria = z.string().min(1, 'obrigatória');

const EnvironmentSchema = z.object({
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.string().default('development'),
  MONGO_URI: obrigatoria,
  GOOGLE_CLIENT_ID: obrigatoria,
  JWT_SECRET_KEY: obrigatoria,
  JWT_REFRESH_SECRET_KEY: obrigatoria,
});

export type Environment = {
  port: number;
  nodeEnv: string;
  googleClientId: string;
  mongoUri: string;
  jwtSecretKey: string;
  jwtRefreshSecretKey: string;
};

// Falha na subida, com a lista do que falta, em vez de quebrar no meio de uma requisição.
export function loadEnvironment(env: NodeJS.ProcessEnv): Environment {
  const result = EnvironmentSchema.safeParse(env);
  if (!result.success) {
    const problemas = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`Variáveis de ambiente inválidas: ${problemas}`);
  }

  const e = result.data;
  return {
    port: e.PORT,
    nodeEnv: e.NODE_ENV,
    googleClientId: e.GOOGLE_CLIENT_ID,
    mongoUri: e.MONGO_URI,
    jwtSecretKey: e.JWT_SECRET_KEY,
    jwtRefreshSecretKey: e.JWT_REFRESH_SECRET_KEY,
  };
}

const environment = loadEnvironment(process.env);

export default environment;
