import express, { Request, Response, Router } from 'express';
import { WalletService } from '../../../application/services/wallet.service';
import { AddFundsDTO, CreateWalletDTO } from '../../../application/dtos/wallet.dto';
import { validateDto } from '../middlewares/validator.middleware';

export class WalletRouter {
  public router: Router;

  constructor(private walletService: WalletService) {
    this.router = express.Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.router.get('/:id', this.getWalletById.bind(this));
    this.router.get('/user/:userId', this.getWalletByUserId.bind(this));
    this.router.post('/', validateDto(CreateWalletDTO), this.createWallet.bind(this));
    this.router.post('/:id/deposit', validateDto(AddFundsDTO), this.addFunds.bind(this));
    this.router.post('/:id/withdraw', validateDto(AddFundsDTO), this.deductFunds.bind(this));
  }

  private async getWalletById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const wallet = await this.walletService.findById(id);
      
      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found' });
        return;
      }
      
      res.status(200).json(wallet);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching wallet' });
    }
  }

  private async getWalletByUserId(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const wallet = await this.walletService.findByUserId(userId);
      
      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found for user' });
        return;
      }
      
      res.status(200).json(wallet);
    } catch (error) {
      res.status(500).json({ message: 'Error fetching wallet' });
    }
  }

  private async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const walletData = req.body as CreateWalletDTO;
      const wallet = await this.walletService.create(walletData);
      res.status(201).json(wallet);
    } catch (error) {
      res.status(500).json({ message: 'Error creating wallet' });
    }
  }

  private async addFunds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount } = req.body as AddFundsDTO;
      
      const wallet = await this.walletService.addFunds(id, amount);
      
      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found' });
        return;
      }
      
      res.status(200).json(wallet);
    } catch (error) {
      res.status(500).json({ message: 'Error adding funds to wallet' });
    }
  }

  private async deductFunds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount } = req.body as AddFundsDTO;
      
      const wallet = await this.walletService.deductFunds(id, amount);
      
      if (!wallet) {
        res.status(404).json({ message: 'Wallet not found' });
        return;
      }
      
      res.status(200).json(wallet);
    } catch (error) {
      if (error instanceof Error && error.message === 'Insufficient funds') {
        res.status(400).json({ message: 'Insufficient funds in wallet' });
        return;
      }
      
      res.status(500).json({ message: 'Error deducting funds from wallet' });
    }
  }
}