import { IBookRepositoryInterface } from '../../domain/repositories/book-repository.interface';
import { Book } from '../../domain/models/book';
import { CreateBookDTO } from '../dtos/book.dto';

export class BookService {

  constructor(private bookRepository: IBookRepositoryInterface) {}
  

  async findById(id: string): Promise<Book | null> {
    return this.bookRepository.findById(id);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<Book[]> {
    return this.bookRepository.findAll(page, limit);
  }

  async findWithFilters(filters: any, page: number, limit: number): Promise<Book[]> {
    const skip = (page - 1) * limit;
    const booksData = await this.bookRepository.find(filters, { skip, limit }); 
    return booksData;
  }

  async create(bookData: CreateBookDTO): Promise<Book> {
    const book = new Book(bookData);
    return this.bookRepository.save(book);
  }

  async update(id: string, bookData: Partial<Book>): Promise<Book | null> {
    const existingBook = await this.bookRepository.findById(id);
    
    if (!existingBook) {
      return null;
    }

    const updatedBookData = { ...existingBook.toObject(), ...bookData, id };
    const updatedBook = new Book(updatedBookData);

    return this.bookRepository.update(updatedBook);
  }

  async delete(id: string): Promise<boolean> {
    return this.bookRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.bookRepository.count();
  }

  mapToBookResponseDTO(book: Book): any {
    throw new Error('Method not implemented.');
  }

}