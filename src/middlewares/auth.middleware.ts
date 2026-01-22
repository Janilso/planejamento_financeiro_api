import { Request, Response, NextFunction } from 'express';
import { environment, TokenConfig } from '../config';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
  };
}

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }

  const tokenConfig = new TokenConfig();

  try {
    const decoded = tokenConfig.verifyToken(
      token,
      environment.jwtSecretKey,
    ) as { id: string };

    req.user = { id: decoded?.id?.toString() };
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
};
