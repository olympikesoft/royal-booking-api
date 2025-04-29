import { IUserRepositoryInterface } from '../../domain/repositories/user-repository.interface';
import { User, UserRole } from '../../domain/models/user';

export class UserService {
  constructor(private userRepository: IUserRepositoryInterface) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<User[]> {
    return this.userRepository.findAll(page, limit);
  }

  async create(userData: {
    name: string;
    email: string;
    phoneNumber?: string;
    role?: UserRole;
  }): Promise<User> {
    const user = new User({
      ...userData,
      role: userData.role || UserRole.MEMBER,
      isActive: true
    });
    
    return this.userRepository.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    
    if (!existingUser) {
      return null;
    }

    const updatedUserData = { ...existingUser.toObject(), ...userData, id };
    const updatedUser = new User(updatedUserData);

    return this.userRepository.update(updatedUser);
  }

  async activate(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      return null;
    }

    user.activate();
    return this.userRepository.update(user);
  }

  async deactivate(id: string): Promise<User | null> {
    const user = await this.userRepository.findById(id);
    
    if (!user) {
      return null;
    }

    user.deactivate();
    return this.userRepository.update(user);
  }

  async delete(id: string): Promise<boolean> {
    return this.userRepository.delete(id);
  }

  async count(): Promise<number> {
    return this.userRepository.count();
  }
}