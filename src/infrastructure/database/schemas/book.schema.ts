// src/infrastructure/database/schemas/book.schema.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface BookDocument extends Document {
  isbn: string;
  title: string;
  authors: string[];
  publicationYear: number;
  publisher: string;
  retailPrice: number;
  totalCopies: number;
  availableCopies: number;
  categories: string[];
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema: Schema = new Schema(
  {
    isbn: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, index: true },
    authors: { type: [String], required: true, index: true },
    publicationYear: { type: Number, required: true, index: true },
    publisher: { type: String, required: true },
    retailPrice: { type: Number, required: true },
    totalCopies: { type: Number, required: true, default: 4 },
    availableCopies: { type: Number, required: true, default: 4 },
    categories: { type: [String], default: [] },
    description: { type: String }
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

// Create text indexes for search functionality
BookSchema.index({ title: 'text', authors: 'text', description: 'text' });

export const BookModel = mongoose.model<BookDocument>('Book', BookSchema);
