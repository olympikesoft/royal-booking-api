import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../../../application/services/auth.service';
import { UserService } from '../../../application/services/user.service';
import { UserRepository } from '../../../infrastructure/repositories/user.repository';
import { UserRole } from '../../../domain/models/user';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);
const authService = new AuthService(userService);

// Extend Request interface to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string; 
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
    return; 
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = authService.verifyToken(token);

    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
      return; // Optional: explicitly return void after sending response
    }

    req.user = {
      id: payload.id,
      email: payload.email,
      role: payload.role
    };

    next(); // Call next() ONLY if authentication succeeds

  } catch (error) {
     // Handle potential errors from verifyToken (like JsonWebTokenError)
     console.error("Token verification failed:", error); // Log the error
     res.status(401).json({
        success: false,
        message: 'Invalid or expired token' // Keep message generic for security
     });
     return; // Optional: explicitly return void after sending response
  }
};

// Authorization middleware factory
export const authorizeRoles = (roles: UserRole[]) => {
  // The actual middleware function returned
  // Add explicit : void return type for clarity
  return (req: Request, res: Response, next: NextFunction): void => {
    // Check if authMiddleware ran successfully and attached the user
    if (!req.user) {
      // CHANGE: Removed 'return'
      res.status(401).json({
        success: false,
        message: 'Authentication required' // Or maybe 500 if this state is unexpected
      });
      return; // Optional: explicitly return void after sending response
    }

    if (!roles.includes(req.user.role as UserRole)) {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
      return; 
    }

    next(); 
  };
};