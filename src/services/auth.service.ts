import { OAuth2Client, TokenPayload } from 'google-auth-library';
import { Document, Model } from 'mongoose';
import { environment, getErrorMongo, TokenConfig } from '../config';
import { AppError } from '../middlewares';
import { UserDocument } from '../models';
import { ERROR_MESSAGES } from '../utils';

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
    const payloadToken = { id: userCreated?.id?.toString() };

    const { token, refreshToken } =
      this.generateTokenAndRefreshToken(payloadToken);

    userCreated.refreshToken = refreshToken;
    await this.saveRefreshTokenInUser(userCreated);

    return { token, refreshToken };
  }

  async refresh(prevRefreshToken: string) {
    const user = await this.userModel.findOne({
      refreshToken: prevRefreshToken,
    });
    if (!user) {
      throw new AppError(401, ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }

    try {
      const tokenConfig = new TokenConfig();
      const decoded = tokenConfig.verifyToken(
        prevRefreshToken,
        environment.jwtRefrashSecretKey,
      );

      if (decoded?.id !== user?.id?.toString()) {
        throw new AppError(401, ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
      }
      const { token, refreshToken } = this.generateTokenAndRefreshToken({
        id: user?.id,
      });
      user.refreshToken = refreshToken;
      await this.saveRefreshTokenInUser(user);

      return { token, refreshToken };
    } catch {
      user.refreshToken = '';
      await this.saveRefreshTokenInUser(user);
      throw new AppError(401, ERROR_MESSAGES.INVALID_REFRESH_TOKEN);
    }
  }

  private generateTokenAndRefreshToken<T extends object>(payloadToken: T) {
    const tokenConfig = new TokenConfig();
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
    return { token, refreshToken };
  }

  private async saveRefreshTokenInUser(user: Document) {
    try {
      await user.save();
    } catch (error) {
      getErrorMongo(error, 'Erro ao salvar token de atualização.');
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
      getErrorMongo(error, ERROR_MESSAGES.SAVE_CREATE);
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
      throw new AppError(401, ERROR_MESSAGES.INVALID_ACCESS, {
        name: 'AuthError',
      });
    }
  }
}

export default AuthService;
