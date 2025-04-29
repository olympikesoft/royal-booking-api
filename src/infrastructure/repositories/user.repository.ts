import { User, UserProps } from '../../domain/models/user';
import { IUserRepositoryInterface } from '../../domain/repositories/user-repository.interface';
import { UserModel, UserDocument } from '../database/schemas/user.schema';
import mongoose from 'mongoose';

export class UserRepository implements IUserRepositoryInterface {
  async findById(id: string): Promise<User | null> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return null;
    }
    
    const userDoc = await UserModel.findById(id);
    return userDoc ? this.documentToDomain(userDoc) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userDoc = await UserModel.findOne({ email });
    return userDoc ? this.documentToDomain(userDoc) : null;
  }

  async findAll(page: number = 1, limit: number = 10): Promise<User[]> {
    const skip = (page - 1) * limit;
    const userDocs = await UserModel.find().skip(skip).limit(limit);
    return userDocs.map(doc => this.documentToDomain(doc));
  }

  async count(): Promise<number> {
    return UserModel.countDocuments();
  }

  async save(user: User): Promise<User> {
    const newUser = new UserModel(this.domainToDocument(user));
    const savedUser = await newUser.save();
    return this.documentToDomain(savedUser);
  }

  async update(user: User): Promise<User> {
    if (!user.id) {
      throw new Error('User ID is required for update');
    }
    
    const updatedUserDoc = await UserModel.findByIdAndUpdate(
      user.id,
      this.domainToDocument(user),
      { new: true }
    );
    
    if (!updatedUserDoc) {
      throw new Error(`User with ID ${user.id} not found`);
    }
    
    return this.documentToDomain(updatedUserDoc);
  }

  async delete(id: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return false;
    }
    
    const result = await UserModel.deleteOne({ _id: id });
    return result.deletedCount === 1;
  }

  private documentToDomain(doc: UserDocument): User {
    const userProps: UserProps = {
      id: doc._id?.toString(),
      name: doc.name,
      email: doc.email,
      phoneNumber: doc.phoneNumber,
      role: doc.role,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
    
    return new User(userProps);
  }

  private domainToDocument(user: User): Partial<UserDocument> {
    return {
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: user.role,
      isActive: user.isActive
    };
  }
}