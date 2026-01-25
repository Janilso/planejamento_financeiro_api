/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { AppError } from '../middlewares';
import { ERROR_MESSAGES } from '../utils';

export function getErrorMongo(e: any, defaultMensage?: string): never {
  if (e instanceof mongoose.Error.CastError) {
    throw new AppError(400, ERROR_MESSAGES.INVALID_ID_TYPE, {
      name: 'DatabaseError',
    });
  }

  if (e.code === 11000) {
    throw new AppError(409, ERROR_MESSAGES.DUPLICATE_KEY, {
      name: 'DatabaseError',
    });
  }

  if (e instanceof mongoose.Error.DocumentNotFoundError) {
    throw new AppError(404, ERROR_MESSAGES.DOCUMENT_NOT_FOUND, {
      name: 'DatabaseError',
    });
  }

  if (e instanceof mongoose.Error.MissingSchemaError) {
    throw new AppError(500, ERROR_MESSAGES.SCHEMA_NOT_FOUND, {
      name: 'DatabaseError',
    });
  }

  if (e instanceof mongoose.Error.OverwriteModelError) {
    throw new AppError(500, ERROR_MESSAGES.OVERWRITE_MODEL_ERROR, {
      name: 'DatabaseError',
    });
  }

  if (e.name === 'MongoNetworkError') {
    throw new AppError(503, ERROR_MESSAGES.MONGO_NETWORK_ERROR, {
      name: 'DatabaseError',
    });
  }
  throw new AppError(500, defaultMensage || ERROR_MESSAGES.REGISTER_ERROR, {
    name: 'DatabaseError',
  });
}
