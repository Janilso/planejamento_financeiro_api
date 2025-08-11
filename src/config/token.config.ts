import jwt from 'jsonwebtoken';
import { StringValue } from 'ms';

class TokenConfig {
  generateToken(payload: object, key: string, expiresIn: StringValue) {
    return jwt.sign(payload, key, {
      expiresIn,
    });
  }
  verifyToken(token: string, key: string) {
    return jwt.verify(token, key);
  }
}

export default TokenConfig;
