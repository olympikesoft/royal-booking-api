import mongoose, { Schema, Document } from 'mongoose';

export interface WalletDocument extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema: Schema = new Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      ref: 'User'
    },
    balance: { type: Number, required: true, default: 0 }
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
      }
    }
  }
);

export const WalletModel = mongoose.model<WalletDocument>('Wallet', WalletSchema);
