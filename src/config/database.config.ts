import mongoose from 'mongoose';
import environment from './environment.config';

export async function connectDB() {
  try {
    await mongoose.connect(environment.mongoUri);
    console.log('MongoDB conectado com sucesso!');
  } catch (error) {
    console.error('Erro ao conectar com MongoDB:', error);
    process.exit(1);
  }
}
