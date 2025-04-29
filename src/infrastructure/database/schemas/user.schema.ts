import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../../../domain/models/user';

export interface UserDocument extends Document {
  name: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phoneNumber: { type: String },
    role: { 
      type: String, 
      enum: Object.values(UserRole), 
      default: UserRole.MEMBER 
    },
    isActive: { type: Boolean, default: true }
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

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);