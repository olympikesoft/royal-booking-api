import { FilterQuery } from 'mongoose';
import { BookDocument } from '../../infrastructure/database/schemas/book.schema';
import { Book } from '../models/book';

export interface IBookRepositoryInterface {
  findById(id: string): Promise<Book | null>;
  find(filters: FilterQuery<BookDocument>, options: { skip: number; limit: number; }): Promise<Book[]>
  findByIsbn(isbn: string): Promise<Book | null>;
  findAll(page: number, limit: number): Promise<Book[]>;
  findByTitle(title: string, page: number, limit: number): Promise<Book[]>;
  findByAuthor(author: string, page: number, limit: number): Promise<Book[]>;
  findByPublicationYear(year: number, page: number, limit: number): Promise<Book[]>;
  count(): Promise<number>;
  countDocuments(filters: FilterQuery<BookDocument>): Promise<number>
  save(book: Book): Promise<Book>;
  update(book: Book): Promise<Book>;
  delete(id: string): Promise<boolean>;
}