import { Book, BookProps } from '../../domain/models/book';
import { IBookRepositoryInterface } from '../../domain/repositories/book-repository.interface';
import { BookModel, BookDocument } from '../database/schemas/book.schema';
import mongoose, { FilterQuery } from 'mongoose';

export class BookRepository implements IBookRepositoryInterface {

async find(filters: FilterQuery<BookDocument>, options: { skip: number; limit: number; }): Promise<Book[]> {
  const bookDocs = await BookModel.find(filters)
    .skip(options.skip)
    .limit(options.limit)
    .exec(); // Use exec() for better promise handling with options
  return bookDocs.map(doc => this.documentToDomain(doc));
}

async countDocuments(filters: FilterQuery<BookDocument>): Promise<number> {
  return BookModel.countDocuments(filters).exec();
}
  async findById(id: string): Promise<Book | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const bookDoc = await BookModel.findById(id);
    return bookDoc ? this.documentToDomain(bookDoc) : null;
  }

  async findByIsbn(isbn: string): Promise<Book | null> {
    const bookDoc = await BookModel.findOne({ isbn });
    return bookDoc ? this.documentToDomain(bookDoc) : null;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<Book[]> {
    const skip = (page - 1) * limit;
    const bookDocs = await BookModel.find().skip(skip).limit(limit);
    return bookDocs.map(doc => this.documentToDomain(doc));
  }

  async findByTitle(title: string, page: number = 1, limit: number = 10): Promise<Book[]> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(title, 'i');
    const bookDocs = await BookModel.find({ title: { $regex: regex } }).skip(skip).limit(limit);
    return bookDocs.map(doc => this.documentToDomain(doc));
  }

  async findByAuthor(author: string, page: number = 1, limit: number = 10): Promise<Book[]> {
    const skip = (page - 1) * limit;
    const regex = new RegExp(author, 'i');
    const bookDocs = await BookModel.find({ authors: { $elemMatch: { $regex: regex } } }).skip(skip).limit(limit);
    return bookDocs.map(doc => this.documentToDomain(doc));
  }

  async findByPublicationYear(year: number, page: number = 1, limit: number = 10): Promise<Book[]> {
    const skip = (page - 1) * limit;
    const bookDocs = await BookModel.find({ publicationYear: year }).skip(skip).limit(limit);
    return bookDocs.map(doc => this.documentToDomain(doc));
  }

  async count(): Promise<number> {
    return BookModel.countDocuments();
  }

  async save(book: Book): Promise<Book> {
    const newBook = new BookModel(this.domainToDocument(book));
    const savedBook = await newBook.save();
    return this.documentToDomain(savedBook);
  }

  async update(book: Book): Promise<Book> {
    if (!book.id) {
      throw new Error('Book ID is required for update');
    }
    
    const updatedBookDoc = await BookModel.findByIdAndUpdate(
      book.id,
      this.domainToDocument(book),
      { new: true }
    );
    
    if (!updatedBookDoc) {
      throw new Error(`Book with ID ${book.id} not found`);
    }
    
    return this.documentToDomain(updatedBookDoc);
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    
    const result = await BookModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  private documentToDomain(doc: BookDocument): Book {
    const bookProps: BookProps = {
      id: doc._id!.toString(),
      isbn: doc.isbn,
      title: doc.title,
      authors: doc.authors,
      publicationYear: doc.publicationYear,
      publisher: doc.publisher,
      retailPrice: doc.retailPrice,
      totalCopies: doc.totalCopies,
      availableCopies: doc.availableCopies,
      categories: doc.categories,
      description: doc.description,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
    
    return new Book(bookProps);
  }

  private domainToDocument(book: Book): Partial<BookDocument> {
    return {
      isbn: book.isbn,
      title: book.title,
      authors: book.authors,
      publicationYear: book.publicationYear,
      publisher: book.publisher,
      retailPrice: book.retailPrice,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      categories: book.categories,
      description: book.description
    };
  }
}
