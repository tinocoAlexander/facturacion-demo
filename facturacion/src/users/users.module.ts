import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UsersAdminService } from './services/users-admin.service';
import { UsersSelfService } from './services/users-self.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    UsersRepository,
    UsersAdminService,
    UsersSelfService,
  ],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
