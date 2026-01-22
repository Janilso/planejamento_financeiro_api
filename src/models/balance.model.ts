import mongoose, { Document, Schema, Types } from 'mongoose';

export type BalanceBaseType = {
  name: string;
  value: number;
  date: string;
  realized: boolean;
  installment: number;
  totalInstallments: number;
  type: string;
  userId?: string;
};

export type BalanceType = BalanceBaseType & {
  createdAt?: string;
  updatedAt?: string;
  listInstallments?: BalanceBaseType[];
};

export interface BalanceDocument extends BalanceType, Document {}

export type BalanceLean = BalanceType & {
  _id: Types.ObjectId;
};

const BalanceInstallmentSchema = new Schema<BalanceBaseType>(
  {
    name: { type: String, required: true },
    value: { type: Number, required: true },
    realized: { type: Boolean, required: true },
    installment: { type: Number, required: true },
    date: { type: String, required: true },
    userId: { type: String },
    totalInstallments: { type: Number, required: true },
    type: { type: String, required: true },
  },
  { _id: false },
);

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
  listInstallments: { type: [BalanceInstallmentSchema], default: [] },
});

export const BalanceModel = mongoose.model<BalanceDocument>(
  'Balance',
  BalanceSchema,
);
