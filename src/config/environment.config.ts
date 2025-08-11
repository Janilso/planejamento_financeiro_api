import dotenv from 'dotenv';

dotenv.config();

type Environment = {
  port: number;
  nodeEnv: string;
  googleClientId: string;
  mongoUri: string;
  jwtSecretKey: string;
  jwtRefrashSecretKey: string;
};

const environment: Environment = {
  port: Number(process.env.PORT) || 8080,
  nodeEnv: process.env.NODE_ENV || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  mongoUri: process.env.MONGO_URI || '',
  jwtSecretKey: process.env.JWT_SECRET_KEY || '',
  jwtRefrashSecretKey: process.env.JWT_REFRESH_SECRET_KEY || '',
};

export default environment;
