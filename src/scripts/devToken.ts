import { environment, TokenConfig } from '../config';

// Token de acesso para testar as rotas protegidas no Swagger (Authorize),
// sem passar pelo login com Google. Nunca em produção.
export function generateDevToken(
  userId: string,
  nodeEnv: string = environment.nodeEnv,
) {
  if (nodeEnv === 'production') {
    throw new Error('token:dev não roda com NODE_ENV=production');
  }
  return new TokenConfig().generateToken(
    { id: userId },
    environment.jwtSecretKey,
    '1h',
  );
}
