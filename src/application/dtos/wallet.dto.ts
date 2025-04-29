// src/application/dtos/wallet.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateWalletDTO {
  @IsString()
  userId!: string;

  @IsNumber()
  @Min(0)
  balance!: number;
}

export class AddFundsDTO {
  @IsNumber()
  @Min(0.01)
  amount!: number;
}

export interface WalletResponseDTO {
  id: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}