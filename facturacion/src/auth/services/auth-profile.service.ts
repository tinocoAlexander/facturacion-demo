import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from '../../users/users.repository';

@Injectable()
export class AuthProfileService {
  constructor(private readonly users: UsersRepository) {}

  async getProfile(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
