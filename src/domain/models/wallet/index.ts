export interface WalletProps {
    id?: string;
    userId: string;
    balance: number;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export class Wallet {
    private props: WalletProps;
  
    constructor(props: WalletProps) {
      this.props = {
        ...props,
        balance: props.balance || 0,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      };
    }
  
    get id(): string | undefined {
      return this.props.id;
    }
  
    get userId(): string {
      return this.props.userId;
    }
  
    get balance(): number {
      return this.props.balance;
    }
  
    get createdAt(): Date {
      return this.props.createdAt as Date;
    }
  
    get updatedAt(): Date {
      return this.props.updatedAt as Date;
    }
  
    deposit(amount: number): void {
      if (amount <= 0) {
        throw new Error("Deposit amount must be positive");
      }
      this.props.balance += amount;
      this.props.updatedAt = new Date();
    }
  
    withdraw(amount: number): void {
      if (amount <= 0) {
        throw new Error("Withdrawal amount must be positive");
      }
  
      if (this.props.balance < amount) {
        throw new Error("Insufficient funds");
      }
  
      this.props.balance -= amount;
      this.props.updatedAt = new Date();
    }
  
    hasEnoughFunds(amount: number): boolean {
      return this.props.balance >= amount;
    }
  
    toObject(): WalletProps {
      return { ...this.props };
    }
  }