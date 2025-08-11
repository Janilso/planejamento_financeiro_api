import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserModel } from '../models';
import { environment, TokenConfig } from '../config';
import { HttpError } from '../middlewares';
import { Document } from 'mongoose';

class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(private readonly clientId: string) {
    this.googleClient = new OAuth2Client(this.clientId);
  }

  async login(googleToken: string) {
    const dataUser = await this.validateGoogleToken(googleToken);

    const userCreated = await this.saveOrCreateUser(dataUser);
    const tokenConfig = new TokenConfig();
    const payloadToken = { id: userCreated?.id };

    const token = tokenConfig.generateToken(
      payloadToken,
      environment.jwtSecretKey,
      '1h',
    );
    const refreshToken = tokenConfig.generateToken(
      payloadToken,
      environment.jwtRefrashSecretKey,
      '7d',
    );

    userCreated.refreshToken = refreshToken;
    await this.saveRefreshTokenInUser(userCreated);

    return { token, refreshToken };
  }

  private async saveRefreshTokenInUser(user: Document) {
    try {
      await user.save();
    } catch (error) {
      console.log(error);
      throw new HttpError('Erro ao salvar usuário', 500);
    }
  }

  private async saveOrCreateUser(user: TokenPayload | undefined) {
    try {
      const userCreated = await UserModel.findOneAndUpdate(
        { email: user?.email },
        { $set: user },
        { upsert: true, new: true },
      );

      return userCreated;
    } catch (error) {
      console.log(error);
      throw new HttpError('Erro ao salvar usuário', 500);
    }
  }

  private async validateGoogleToken(idToken: string) {
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      return ticket.getPayload();
    } catch {
      throw new HttpError('Não autorizado', 401);
    }
  }
}

export default AuthService;
