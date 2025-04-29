import { IsString, IsNumber, IsArray, IsOptional, IsISBN, Min, ArrayMinSize } from 'class-validator';

export class CreateBookDTO {
  @IsISBN()
  isbn!: string;

  @IsString()
  title!: string; 

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  authors!: string[];

  @IsNumber()
  @Min(0)
  publicationYear!: number;

  @IsString()
  publisher!: string;

  @IsNumber()
  @Min(0)
  retailPrice!: number;

  @IsNumber()
  @Min(1)
  totalCopies!: number;

  @IsNumber()
  @Min(0)
  availableCopies!: number;

  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateBookDTO {
  @IsOptional()
  @IsISBN()
  isbn?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  authors?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  publicationYear?: number;

  @IsOptional()
  @IsString()
  publisher?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  retailPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalCopies?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  availableCopies?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsString()
  description?: string;
}

export interface BookResponseDTO {
  id: string;
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
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}
