import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersAdminService } from './services/users-admin.service';
import { UsersSelfService } from './services/users-self.service';
import { I_USERS_REPOSITORY } from './interfaces/users-repository.interface';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: I_USERS_REPOSITORY,
      useClass: UsersRepository,
    },
    UsersAdminService,
    UsersSelfService,
  ],
  exports: [UsersService, I_USERS_REPOSITORY],
})
export class UsersModule {}
