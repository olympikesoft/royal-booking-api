import express, { Request, Response, Router } from 'express';
import { UserService } from '../../../application/services/user.service';
import { validateDto } from '../middlewares/validator.middleware';
import { CreateUserDTO, UpdateUserDTO } from '../../../application/dtos/user.dto'
import { config } from '../../../config';

export class UserRouter {
  public router: Router;

  constructor(private userService: UserService) {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/', this.getAllUsers.bind(this));
    this.router.get('/:id', this.getUserById.bind(this));
    this.router.post('/', validateDto(CreateUserDTO), this.createUser.bind(this));
    this.router.put('/:id', validateDto(UpdateUserDTO), this.updateUser.bind(this));
    this.router.delete('/:id', this.deleteUser.bind(this));
  }

  private async getAllUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || config.pagination.defaultLimit;
      
      const users = await this.userService.findAll(page, limit);
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching users' });
    }
  }

  private async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching user' });
    }
  }

  private async createUser(req: Request, res: Response): Promise<void> {
    try {
      const userData = req.body as CreateUserDTO;
      const user = await this.userService.create(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error creating user' });
    }
  }

  private async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userData = req.body as UpdateUserDTO;
      const user = await this.userService.update(id, userData);
      
      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(200).json(user);
    } catch (error) {
      res.status(500).json({ message: 'Error updating user' });
    }
  }

  private async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const success = await this.userService.delete(id);
      
      if (!success) {
        res.status(404).json({ message: 'User not found' });
        return;
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Error deleting user' });
    }
  }
}