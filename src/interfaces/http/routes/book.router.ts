import express, { Request, Response, Router } from 'express';
import { BookService } from '../../../application/services/book.service';
import { validateDto } from '../middlewares/validator.middleware';
import { CreateBookDTO, UpdateBookDTO } from '../../../application/dtos/book.dto';
import { config } from '../../../config';

export class BookRouter {
  public router: Router;

  constructor(private bookService: BookService) {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getAllBooksOrSearch.bind(this));
    this.router.get('/:id', this.getBookById.bind(this));
    this.router.post('/', validateDto(CreateBookDTO), this.createBook.bind(this));
    this.router.put('/:id', validateDto(UpdateBookDTO), this.updateBook.bind(this));
    this.router.delete('/:id', this.deleteBook.bind(this));
  }

   private async getAllBooksOrSearch(req: Request, res: Response): Promise<void> {
    try {
      const { title, author, year, isbn /* Added for clarity if ISBN search needed */ } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;

      const filters: { [key: string]: any } = {}; 
      if (title) {
        filters.title = new RegExp(title as string, 'i'); 
      }
      if (author) {
         filters.authors = { $regex: new RegExp(author as string, 'i') }; 
      }
      if (year) {
        const parsedYear = parseInt(year as string);
        if (!isNaN(parsedYear)) {
          filters.publicationYear = parsedYear;
        } else {
           res.status(400).json({ message: 'Invalid year format provided for search.' });
           return;
        }
      }
      if (isbn) { // If you want to keep ISBN search
        filters.isbn = isbn as string;
      }

      const result = await this.bookService.findWithFilters(filters, page, limit); 
      res.status(200).json(result); 

    } catch (error: any) {
       console.error("Error fetching/searching books:", error); 
       res.status(500).json({ message: 'An error occurred while retrieving books.' }); 
    }
  }

  private async getBookById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const book = await this.bookService.findById(id);
      
      if (!book) {
        res.status(404).json({ message: 'Book not found' });
        return;
      }
      
      res.status(200).json(book);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching book' });
    }
  }

  private async createBook(req: Request, res: Response): Promise<void> {
    try {
      const bookData = req.body as CreateBookDTO;
      const book = await this.bookService.create(bookData);
      res.status(201).json(book);
    } catch (error) {
      res.status(500).json({ message: 'Error creating book' });
    }
  }

  private async updateBook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const bookData = req.body as UpdateBookDTO;
      const book = await this.bookService.update(id, bookData);
      
      if (!book) {
        res.status(404).json({ message: 'Book not found' });
        return;
      }
      
      res.status(200).json(book);
    } catch (error) {
      res.status(500).json({ message: 'Error updating book' });
    }
  }

  private async deleteBook(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.bookService.delete(id);
      
      if (!success) {
        res.status(404).json({ message: 'Book not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting book' });
    }
  }
}