import { ResponseUserDto } from './dtos';
import { PublicUser, User } from './users.types';

export function mapToResponseUserDto(
  user: PublicUser | Omit<User, 'password_hash'>,
): ResponseUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.full_name,
    role: user.role,
    isActive: user.is_active,
    lastLoginAt: user.last_login_at,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
}
