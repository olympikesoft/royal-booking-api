import { IWalletRepositoryInterface } from '../../domain/repositories/wallet-repository.interface';
import { Wallet } from '../../domain/models/wallet';

export class WalletService {
  constructor(private walletRepository: IWalletRepositoryInterface) {}

  async findById(id: string): Promise<Wallet | null> {
    return this.walletRepository.findById(id);
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    return this.walletRepository.findByUserId(userId);
  }


  async create(
    walletData: {
      userId: string;
      balance: number;
      }): Promise<Wallet> {
    const wallet = new Wallet(
      {
            ...walletData,
        });
    return this.walletRepository.save(wallet);
  }

  async addFunds(walletId: string, amount: number): Promise<Wallet | null> {
    const wallet = await this.walletRepository.findById(walletId);
    
    if (!wallet) {
      return null;
    }

    wallet.deposit(amount);
    return this.walletRepository.update(wallet);
  }

  async deductFunds(walletId: string, amount: number): Promise<Wallet | null> {
    const wallet = await this.walletRepository.findById(walletId);
    
    if (!wallet) {
      return null;
    }

    if (!wallet.hasEnoughFunds(amount)) {
      throw new Error('Insufficient funds');
    }

    wallet.withdraw(amount);
    return this.walletRepository.update(wallet);
  }

  async hasEnoughFunds(walletId: string, amount: number): Promise<boolean> {
    const wallet = await this.walletRepository.findById(walletId);
    
    if (!wallet) {
      return false;
    }

    return wallet.hasEnoughFunds(amount);
  }
}