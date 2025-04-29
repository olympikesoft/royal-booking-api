export enum UserRole {
    ADMIN = 'ADMIN',
    LIBRARIAN = 'LIBRARIAN',
    MEMBER = 'MEMBER'
  }
  
  export interface UserProps {
    id?: string;
    name: string;
    email: string;
    phoneNumber?: string;
    role: UserRole;
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
  }
  
  export class User {
    private props: UserProps;
  
    constructor(props: UserProps) {
      this.props = {
        ...props,
        role: props.role || UserRole.MEMBER,
        isActive: props.isActive !== undefined ? props.isActive : true,
        createdAt: props.createdAt || new Date(),
        updatedAt: props.updatedAt || new Date()
      };
    }
  
    get id(): string | undefined {
      return this.props.id;
    }
  
    get name(): string {
      return this.props.name;
    }
  
    get email(): string {
      return this.props.email;
    }
  
    get phoneNumber(): string | undefined {
      return this.props.phoneNumber;
    }
  
    get role(): UserRole {
      return this.props.role;
    }
  
    get isActive(): boolean {
      return this.props.isActive;
    }
  
    get createdAt(): Date {
      return this.props.createdAt as Date;
    }
  
    get updatedAt(): Date {
      return this.props.updatedAt as Date;
    }
  
    deactivate(): void {
      this.props.isActive = false;
      this.props.updatedAt = new Date();
    }
  
    activate(): void {
      this.props.isActive = true;
      this.props.updatedAt = new Date();
    }
  
    toObject(): UserProps {
      return { ...this.props };
    }
  }