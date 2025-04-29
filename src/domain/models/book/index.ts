import { Types } from "mongoose";

export interface BookProps {
  id?: string | Types.ObjectId;
  _id?: Types.ObjectId;       
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
  createdAt?: Date;
  updatedAt?: Date;
}

export class Book {
  private props: BookProps;

  constructor(props: BookProps) {
    this.props = {
      ...props,
      totalCopies: props.totalCopies || 4,
      availableCopies: props.availableCopies || props.totalCopies || 4,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
    };
  }

  get id(): string | Types.ObjectId | undefined {
    return this.props.id;
  }

  get isbn(): string {
    return this.props.isbn;
  }

  get title(): string {
    return this.props.title;
  }

  get authors(): string[] {
    return this.props.authors;
  }

  get publicationYear(): number {
    return this.props.publicationYear;
  }

  get publisher(): string {
    return this.props.publisher;
  }

  get retailPrice(): number {
    return this.props.retailPrice;
  }

  get totalCopies(): number {
    return this.props.totalCopies;
  }

  get availableCopies(): number {
    return this.props.availableCopies;
  }

  get categories(): string[] {
    return this.props.categories;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get createdAt(): Date {
    return this.props.createdAt as Date;
  }

  get updatedAt(): Date {
    return this.props.updatedAt as Date;
  }

  // Domain logic
  isAvailable(): boolean {
    return this.props.availableCopies > 0;
  }

  borrowCopy(): void {
    if (!this.isAvailable()) {
      throw new Error("No copies available for borrowing");
    }
    this.props.availableCopies -= 1;
    this.props.updatedAt = new Date();
  }

  returnCopy(): void {
    if (this.props.availableCopies >= this.props.totalCopies) {
      throw new Error("Cannot return more copies than total");
    }
    this.props.availableCopies += 1;
    this.props.updatedAt = new Date();
  }

  toObject(): BookProps {
    return { ...this.props };
  }
}
