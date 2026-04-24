import { Module } from '@nestjs/common';
import * as path from 'path';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: path.join(process.cwd(), '.env'),
      isGlobal: true,
    }),
    HealthModule,
    DatabaseModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
