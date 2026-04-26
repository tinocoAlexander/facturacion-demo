import { User, PublicUser } from '../users.types';

export const I_USERS_REPOSITORY = 'I_USERS_REPOSITORY';

export interface IUsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findActiveByEmail(email: string): Promise<User | null>;
  findById(id: number): Promise<PublicUser | null>;
  findByIdWithHash(id: number): Promise<User | null>;
  emailExists(email: string): Promise<boolean>;
  create(email: string, passwordHash: string, fullName: string): Promise<PublicUser>;
  updateLastLogin(id: number): Promise<void>;
  updateProfile(id: number, fullName: string): Promise<PublicUser | null>;
  changePassword(id: number, newPasswordHash: string): Promise<boolean>;
  setActiveStatus(id: number, isActive: boolean): Promise<PublicUser | null>;
  setRole(id: number, role: string): Promise<PublicUser | null>;
  findAll(limit: number, offset: number): Promise<PublicUser[]>;
  countAll(): Promise<number>;
}
