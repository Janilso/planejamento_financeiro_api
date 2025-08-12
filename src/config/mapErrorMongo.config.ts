/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from 'mongoose';
import { HttpError } from '../middlewares';

export function getErrorMongo(e: any, defaultMensage?: string): never {
  if (e instanceof mongoose.Error.CastError) {
    throw new HttpError('ID malformado ou tipo inválido', 400);
  }

  if (e.code === 11000) {
    throw new HttpError('Chave duplicada', 409);
  }

  if (e instanceof mongoose.Error.DocumentNotFoundError) {
    throw new HttpError('Documento não encontrado', 404);
  }

  if (e instanceof mongoose.Error.MissingSchemaError) {
    throw new HttpError('Schema não encontrado para o model', 500);
  }

  if (e instanceof mongoose.Error.OverwriteModelError) {
    throw new HttpError('Model já foi registrado anteriormente', 500);
  }

  if (e.name === 'MongoNetworkError') {
    throw new HttpError('Erro de rede ao conectar com MongoDB', 503);
  }
  throw new HttpError(defaultMensage || 'Erro ao registar dado', 500);
}
