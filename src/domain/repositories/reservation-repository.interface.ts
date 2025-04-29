import { Reservation, ReservationStatus } from '../models/reservation';

/**
 * Type for database transaction object
 * The actual type depends on your database driver 
 */
export type DbTransaction = any;

export interface IReservationRepositoryInterface {
  findLateReservations(): Reservation[] | PromiseLike<Reservation[]>;
  findById(id: string): Promise<Reservation | null>;
  findByUserId(userId: string, page: number, limit: number): Promise<Reservation[]>;
  findByBookId(bookId: string, page: number, limit: number): Promise<Reservation[]>;
  findByStatus(status: ReservationStatus, page: number, limit: number): Promise<Reservation[]>;
  findActiveReservationsByUserId(userId: string): Promise<Reservation[]>;
  findActiveReservationsByBookId(bookId: string): Promise<Reservation[]>;
  findReservationsDueSoon(days: number): Promise<Reservation[]>;
  findOverdueReservations(days: number): Promise<Reservation[]>;
  countActiveReservationsByUserId(userId: string): Promise<number>;
  countActiveReservationsByBookId(bookId: string): Promise<number>;
  save(reservation: Reservation): Promise<Reservation>;
  update(reservation: Reservation): Promise<Reservation>;
  delete(id: string): Promise<boolean>;
 // beginTransaction(): Promise<DbTransaction>;
 // commitTransaction(transaction: DbTransaction): Promise<void>;
 // rollbackTransaction(transaction: DbTransaction): Promise<void>;
}