import { Wallet } from '../models/wallet';

export type DbTransaction = any;

export interface IWalletRepositoryInterface {
  findById(id: string): Promise<Wallet | null>;
  findByUserId(userId: string): Promise<Wallet | null>;
  save(wallet: Wallet, transaction?: DbTransaction): Promise<Wallet>;
  update(wallet: Wallet, transaction?: DbTransaction): Promise<Wallet>;
  delete(id: string, transaction?: DbTransaction): Promise<boolean>;
}