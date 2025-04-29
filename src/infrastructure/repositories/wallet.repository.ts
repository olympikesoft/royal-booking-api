import { IWalletRepositoryInterface } from '../../domain/repositories/wallet-repository.interface';
import { Wallet, WalletProps } from '../../domain/models/wallet';
import { WalletModel, WalletDocument } from '../database/schemas/wallet.schema';
import mongoose from 'mongoose';

export class WalletRepository implements IWalletRepositoryInterface {
  async findById(id: string): Promise<Wallet | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const walletDoc = await WalletModel.findById(id);
    return walletDoc ? this.documentToDomain(walletDoc) : null;
  }

  async findByUserId(userId: string): Promise<Wallet | null> {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null;
    }
    
    const walletDoc = await WalletModel.findOne({ userId });
    return walletDoc ? this.documentToDomain(walletDoc) : null;
  }

  async save(wallet: Wallet): Promise<Wallet> {
    const newWallet = new WalletModel({
      userId: wallet.userId,
      balance: wallet.balance
    });
    
    const savedWallet = await newWallet.save();
    return this.documentToDomain(savedWallet);
  }

  async update(wallet: Wallet): Promise<Wallet> {
    if (!wallet.id) {
      throw new Error('Wallet ID is required for update');
    }
    
    const updatedWalletDoc = await WalletModel.findByIdAndUpdate(
      wallet.id,
      { balance: wallet.balance },
      { new: true }
    );
    
    if (!updatedWalletDoc) {
      throw new Error(`Wallet with ID ${wallet.id} not found`);
    }
    
    return this.documentToDomain(updatedWalletDoc);
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    
    const result = await WalletModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  private documentToDomain(doc: WalletDocument): Wallet {
    const walletProps: WalletProps = {
      id: doc._id?.toString(),
      userId: doc.userId.toString(),
      balance: doc.balance,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
    
    return new Wallet(walletProps);
  }
}