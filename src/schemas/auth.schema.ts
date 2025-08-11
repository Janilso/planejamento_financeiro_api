import z from 'zod';

class AuthSchema {
  static readonly login = z.object({
    googleToken: z.string().min(1, 'Parâmetro obrigatório.'),
  });
}

export default AuthSchema;
