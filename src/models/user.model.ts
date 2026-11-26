import mongoose, { Document, Schema } from 'mongoose';

export type UserType = {
  name: string;
  email: string;
  picture: string;
  // sha256 do refresh token atual; o token em si nunca é gravado.
  refreshTokenHash: string;
};

export interface UserDocument extends UserType, Document {}

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  picture: String,
  refreshTokenHash: String,
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
