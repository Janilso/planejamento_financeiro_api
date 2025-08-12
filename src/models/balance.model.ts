import mongoose, { Document, Schema } from 'mongoose';

export type BalanceType = {
  userId?: string;
  name: string;
  value: number;
  realized: boolean;
  type: string;
  installment: number;
  totalInstallments: number;
  date: string;
  createdAt?: string;
  updatedAt?: string;
  listInstallments?: object[];
};

export interface BalanceDocument extends BalanceType, Document {}

const BalanceSchema = new Schema({
  userId: { type: String, require: true },
  name: { type: String, require: true, unique: true },
  value: { type: Number, require: true },
  realized: Boolean,
  type: { type: String, require: true },
  installment: { type: Number, require: true },
  totalInstallments: { type: Number, default: 0 },
  date: { type: String, require: true },
  createdAt: { type: String, default: new Date().toISOString() },
  updatedAt: String,
});

export const BalanceModel = mongoose.model<BalanceDocument>(
  'Balance',
  BalanceSchema,
);
