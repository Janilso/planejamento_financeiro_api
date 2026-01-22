import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { UserDocument } from '../models';
import { environment, getErrorMongo, TokenConfig } from '../config';
import { HttpError } from '../middlewares';
import { Document, Model } from 'mongoose';

class AuthService {
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly clientId: string,
    private readonly userModel: Model<UserDocument>,
  ) {
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
      '15d',
    );

    userCreated.refreshToken = refreshToken;
    await this.saveRefreshTokenInUser(userCreated);

    return { token, refreshToken };
  }

  private async saveRefreshTokenInUser(user: Document) {
    try {
      await user.save();
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar ganho ou gasto');
    }
  }

  private async saveOrCreateUser(user: TokenPayload | undefined) {
    try {
      const userCreated = await this.userModel.findOneAndUpdate(
        { email: user?.email },
        { $set: user },
        { upsert: true, new: true },
      );

      return userCreated;
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar ganho ou gasto');
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
