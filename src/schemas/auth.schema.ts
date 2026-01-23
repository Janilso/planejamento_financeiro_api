import z from 'zod';

class AuthSchema {
  static readonly login = z.object({
    googleToken: z.string().min(1, 'Parâmetro obrigatório.'),
  });
  static readonly refresh = z.object({
    refreshToken: z.string().min(1, 'Parâmetro obrigatório.'),
  });
}

export default AuthSchema;
