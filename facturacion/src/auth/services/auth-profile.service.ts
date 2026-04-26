import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { IUsersRepository } from '../../users/interfaces/users-repository.interface';
import { I_USERS_REPOSITORY } from '../../users/interfaces/users-repository.interface';

@Injectable()
export class AuthProfileService {
  constructor(
    @Inject(I_USERS_REPOSITORY)
    private readonly users: IUsersRepository,
  ) {}

  async getProfile(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
