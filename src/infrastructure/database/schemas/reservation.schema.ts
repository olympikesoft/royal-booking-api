import mongoose, { Schema, Document } from 'mongoose';
import { ReservationStatus } from '../../../domain/models/reservation';

export interface ReservationDocument extends Document {
  userId: mongoose.Types.ObjectId;
  bookId: mongoose.Types.ObjectId;
  status: ReservationStatus;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  fee: number;
  lateFee: number;
  reminderSent: boolean;
  lateReminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReservationSchema: Schema = new Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      ref: 'User',
      index: true 
    },
    bookId: { 
      type: mongoose.Schema.Types.ObjectId, 
      required: true, 
      ref: 'Book',
      index: true 
    },
    status: { 
      type: String, 
      enum: Object.values(ReservationStatus), 
      default: ReservationStatus.PENDING,
      index: true 
    },
    borrowDate: { type: Date, required: true },
    dueDate: { type: Date, required: true, index: true },
    returnDate: { type: Date },
    fee: { type: Number, required: true, default: 3 },
    lateFee: { type: Number, default: 0 },
    reminderSent: { type: Boolean, default: false },
    lateReminderSent: { type: Boolean, default: false }
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

ReservationSchema.index({ 
  userId: 1, 
  status: 1 
});

ReservationSchema.index({ 
  bookId: 1, 
  status: 1 
});

export const ReservationModel = mongoose.model<ReservationDocument>('Reservation', ReservationSchema);