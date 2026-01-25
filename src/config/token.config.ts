import jwt, { JwtPayload } from 'jsonwebtoken';
import { StringValue } from 'ms';

class TokenConfig {
  generateToken(payload: object, key: string, expiresIn: StringValue) {
    return jwt.sign(payload, key, {
      expiresIn,
    });
  }
  verifyToken<T>(token: string, key: string) {
    return jwt.verify(token, key) as JwtPayload & T;
  }
}

export default TokenConfig;
