import { connectDB } from './database.config';
import environment from './environment.config';
import { getErrorMongo } from './mapErrorMongo.config';
import TokenConfig from './token.config';

export { environment, connectDB, TokenConfig, getErrorMongo };
