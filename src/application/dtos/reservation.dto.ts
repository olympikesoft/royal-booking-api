import { IsISO8601, IsNotEmpty, IsString } from 'class-validator';
import { ReservationStatus } from '../../domain/models/reservation';

export class ForceDueDateDTO {
  @IsNotEmpty()
  @IsISO8601({ strict: true, strictSeparator: true }, { message: 'dueDate must be a valid ISO 8601 date string (e.g., 2023-10-27T10:00:00.000Z)' })
  dueDate: string | undefined;
}

export class CreateReservationDTO {
  @IsString()
  userId!: string;

  @IsString()
  bookId!: string;
}



export interface ReservationResponseDTO {
  id: string;
  userId: string;
  bookId: string;
  status: ReservationStatus;
  borrowDate: Date;
  dueDate: Date;
  returnDate?: Date;
  fee: number;
  lateFee: number;
  totalFee: number;
  createdAt: Date;
  updatedAt: Date;
}