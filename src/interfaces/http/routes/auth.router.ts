import express from 'express';
import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../../../application/services/auth.service';
import { ApiError } from '../middlewares/error-handler.middleware';
import { CreateUserDTO } from  '../../../application/dtos/user.dto';
import { validateDto } from '../middlewares/validator.middleware';

export class AuthRouter {
   public router: Router;
  
    constructor(private authService: AuthService) {
      this.router = express.Router();
      this.setupRoutes();
    }
  
    private setupRoutes(): void {
      this.router.post('/login', validateDto(CreateUserDTO), this.login.bind(this));
      this.router.get('/me', this.getCurrentUser.bind(this));
      this.router.post('/validate', this.validate.bind(this));
    }

  
  /**
   * @desc Authenticate user & get token
   * @access Public
   */
  private async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      
      // Validate request
      if (!email || !password) {
        throw new ApiError('Please provide email and password', 400);
      }
      
      // Authenticate user
      const response = await this.authService.login(email, password);
      
      if (!response) {
        throw new ApiError('Invalid credentials', 401);
      }
      
      res.status(200).json({
        success: true,
        token: response.token,
        user: response.user
      });
    } catch (error) {
      res.status(500).json({ message: 'Error login' });
    }
  };
  
  /**
   * @desc Get current user info from token
   * @access Private
   */
  private async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError('No token, authorization denied', 401);
      }
      
      const token = authHeader.split(' ')[1];
      const user = this.authService.verifyToken(token);
      
      if (!user) {
        throw new ApiError('Token is not valid', 401);
      }
      
      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      res.status(500).json({ message: 'Error getCurrentUser' });
    }
  };
  
  /**
   * @route POST /api/auth/validate
   * @desc Validate JWT token
   * @access Public
   */
  private async validate(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;
      
      if (!token) {
        throw new ApiError('No token provided', 400);
      }
      
      const decoded = this.authService.verifyToken(token);
      
      if (!decoded) {
        res.status(200).json({
          success: true,
          isValid: false
        });
      }
      
      res.status(200).json({
        success: true,
        isValid: true,
        user: decoded
      });
    } catch (error) {
      res.status(500).json({ message: 'Error validate' });
    }
  };

};