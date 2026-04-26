import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { EmpresasModule } from '../empresas/empresas.module';
import { LoginAttemptsService } from './security/login-attempts.service';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { AuthCredentialsService } from './services/auth-credentials.service';
import { AuthSessionService } from './services/auth-session.service';
import { AuthProfileService } from './services/auth-profile.service';
import { RefreshTokenService } from './services/refresh-token.service';
import type { StringValue } from 'ms';

@Module({
  imports: [
    PassportModule,
    UsersModule,
    EmpresasModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const privateKey = configService.get<string>('JWT_PRIVATE_KEY');
        const secret = configService.get<string>('JWT_SECRET');

        return {
          // Si hay privateKey usamos RS256, si no, fallback a HS256
          privateKey: privateKey ? privateKey.replace(/\\n/g, '\n') : undefined,
          secret: !privateKey ? secret : undefined,
          signOptions: {
            algorithm: privateKey ? 'RS256' : 'HS256',
            expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ??
              '15m') as StringValue,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCredentialsService,
    AuthSessionService,
    AuthProfileService,
    RefreshTokenService,
    JwtStrategy,
    LoginAttemptsService,
    RefreshTokensRepository,
  ],
})
export class AuthModule {}
