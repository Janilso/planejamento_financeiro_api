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
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token ausente' });
  }

  const tokenConfig = new TokenConfig();

  try {
    const decoded = tokenConfig.verifyToken(
      token,
      environment.jwtSecretKey,
    ) as { id: string };

    // const user = await User.findById(decoded.userId);
    // if (!user) {
    //   return res.status(401).json({ error: 'Usuário não encontrado' });
    // }

    req.user = { id: decoded?.id?.toString() };
    next();
  } catch {
    return res.status(403).json({ message: 'Token inválido ou expirado' });
  }
};
