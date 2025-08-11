import mongoose, { Document, Schema } from 'mongoose';

interface IUser extends Document {
  name: string;
  email: string;
  picture: string;
  refreshToken: string;
}

const UserSchema = new Schema({
  name: { type: String, require: true },
  email: { type: String, require: true, unique: true },
  picture: String,
  refreshToken: String,
});

export const UserModel = mongoose.model<IUser>('User', UserSchema);
