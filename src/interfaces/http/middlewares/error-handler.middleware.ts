import { Request, Response, NextFunction } from 'express';

export class ApiError extends Error {
  statusCode: number;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

// Global error handler middleware
export const errorHandler = (
  err: Error, 
  req: Request, 
  res: Response, 
  next: NextFunction
) => {
  console.error('Error:', err.message);
  
  // Handle specific API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  
  // Handle specific error types
  if (err.message === 'Insufficient funds') {
    return res.status(400).json({
      success: false,
      message: 'Insufficient funds in wallet'
    });
  }
  
  if (err.message === 'Book not found' || err.message === 'User not found' || err.message === 'Wallet not found' || err.message === 'Reservation not found') {
    return res.status(404).json({
      success: false,
      message: err.message
    });
  }
  
  if (err.message === 'Book is not available for reservation') {
    return res.status(400).json({
      success: false,
      message: 'Book is not available for reservation'
    });
  }
  
  if (err.message === 'User already has this book') {
    return res.status(400).json({
      success: false,
      message: 'User already has this book'
    });
  }
  
  if (err.message === 'User has reached the maximum number of books allowed' || err.message === 'User has reached the maximum number of books allowed (3)') {
    return res.status(400).json({
      success: false,
      message: 'Maximum number of books (3) already borrowed'
    });
  }
  
  // Default to 500 server error
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
};