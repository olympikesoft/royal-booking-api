import { config, connectToDatabase } from './config'; 

// Import repositories
import { BookRepository } from './infrastructure/repositories/book.repository';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { ReservationRepository } from './infrastructure/repositories/reservation.repository';

// Import services
import { EmailService } from './infrastructure/email/email.service';
import { SchedulerService } from './infrastructure/scheduler/scheduler.service';
import { BookService } from './application/services/book.service';
import { UserService } from './application/services/user.service';
import { WalletService } from './application/services/wallet.service'; // Keep WalletService
import { ReservationService } from './application/services/reservation.service';
import { AuthService } from './application/services/auth.service';

import { Api } from './interfaces/http/api'; // Adjust path if needed

import http from 'http';

async function bootstrap() {
  await connectToDatabase();
  console.log('Database connected successfully.');

  const bookRepository = new BookRepository();
  const userRepository = new UserRepository();
  const walletRepository = new WalletRepository();
  const reservationRepository = new ReservationRepository();
  console.log('Repositories initialized.');

  const emailService = new EmailService(config); // Pass config if needed by EmailService

  const bookService = new BookService(bookRepository);
  const userService = new UserService(userRepository);
  const walletService = new WalletService(walletRepository); // Initialize WalletService
  const reservationService = new ReservationService(
    reservationRepository,
    bookRepository,
    userRepository,
    walletRepository,
    emailService // Pass the initialized emailService
  );
  const authService = new AuthService(userService); 
  console.log('Application services initialized.');

  const schedulerService = new SchedulerService(reservationService); 
  console.log('Scheduler service initialized.');

  const api = new Api(
    bookService,
    userService,
    walletService,
    reservationService,
    authService     
  );
  console.log('API layer initialized.');

  const server: http.Server = api.start(); 

  schedulerService.startJobs();
  console.log('Scheduled jobs started.');

  const gracefulShutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);

    server.close((err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        process.exit(1); // Exit with error if server closing fails
      } else {
        console.log('HTTP server closed.');
        console.log('Exiting process.');
        process.exit(0); 
      }
    });

    setTimeout(() => {
      console.error('Could not close connections in time, forcing shutdown.');
      process.exit(1);
    }, 10000); 
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch(error => {
  console.error('Error starting application:', error);
  process.exit(1); // Exit with error code if bootstrap fails
});