import mongoose, { Document, Schema } from 'mongoose';

export type UserType = {
  name: string;
  email: string;
  picture: string;
  refreshToken: string;
};

export interface UserDocument extends UserType, Document {}

const UserSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  picture: String,
  refreshToken: String,
});

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
