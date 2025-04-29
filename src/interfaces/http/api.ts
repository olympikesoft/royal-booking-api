import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import http from 'http'; 

import { config } from '../../config';
import { BookRouter } from './routes/book.router';
import { UserRouter } from './routes/user.router';
import { WalletRouter } from './routes/wallet.router'; 
import { ReservationRouter } from './routes/reservation.router';
import { AuthRouter } from './routes/auth.router'; 

import { BookService } from '../../application/services/book.service';
import { UserService } from '../../application/services/user.service';
import { WalletService } from '../../application/services/wallet.service'; 
import { ReservationService } from '../../application/services/reservation.service';
import { AuthService } from '../../application/services/auth.service'; 

import { authMiddleware } from './middlewares/auth.middleware'; 

export class Api {
  public app: Application;

  constructor(
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly walletService: WalletService, 
    private readonly reservationService: ReservationService,
    private readonly authService: AuthService    
  ) {
    this.app = express();
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupErrorHandling(); 
  }

  private setupMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cors());
    this.app.use(helmet());
    this.app.use(compression());
    console.log('Common middleware configured.');
  }

  private setupRoutes(): void {
    const bookRouter = new BookRouter(this.bookService);
    const userRouter = new UserRouter(this.userService);
    const walletRouter = new WalletRouter(this.walletService);
    const reservationRouter = new ReservationRouter(this.reservationService);
    const authRouter = new AuthRouter(this.authService); // Create AuthRouter instance

    // Health check - public, no auth needed
    this.app.get('/health', (req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', environment: config.server.environment });
    });

    // Not necessary for now adding Authentication logic
    // this.app.use('/api', authMiddleware); 
    //this.app.use('/api/v1/auth', authRouter.router); 

    this.app.use('/api/v1/books', bookRouter.router);
    this.app.use('/api/v1/users', userRouter.router);
    this.app.use('/api/v1/wallets', walletRouter.router);
    this.app.use('/api/v1/reservations', reservationRouter.router);
    console.log('API routes configured.');
  }

  private setupErrorHandling(): void {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
        if (!res.headersSent) {
            res.status(404).json({ message: 'Resource not found' });
        } else {
            next();
        }
    });
    console.log('Error handler configured.');
  }

  public start(): http.Server { // Return http.Server
    const server = this.app.listen(config.server.port, () => {
      const host = config.server.host || 'localhost';
      console.log(`Server running on port ${config.server.port} in ${config.server.environment} mode`);
      // console.log(`Server running on http://${host}:${config.server.port}`); // Optional more specific log
    });
    return server; // Return the server instance
  }
}