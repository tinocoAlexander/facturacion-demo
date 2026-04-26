import {
  BadRequestException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../../users/dtos';
import { UsersRepository } from '../../users/users.repository';
import { AuditService } from '../../audit/audit.service';
import { LoginDto } from '../dtos';
import { JwtPayload } from '../strategies/jwt.strategy';
import { LoginAttemptsService } from '../security/login-attempts.service';
import { RefreshTokenService } from './refresh-token.service';
import { MetricsService } from '../../metrics/metrics.service';

const BCRYPT_ROUNDS = 12;
const INVALID_CREDS = 'Credenciales inválidas';

export type RequestContext = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthCredentialsService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
  ) {}

  async register(dto: CreateUserDto, ctx?: RequestContext) {
    const exists = await this.users.emailExists(dto.email);
    if (exists) {
      throw new BadRequestException({
        message: 'El email ya está registrado',
        code: 'AUTH_EMAIL_ALREADY_REGISTERED',
      });
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create(dto.email, passwordHash, dto.fullName);

    await this.audit.log('AUTH_REGISTER', {
      actorUserId: user.id,
      targetUserId: user.id,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      metadata: { email: user.email },
    });

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
    };
  }

  async login(dto: LoginDto, ctx?: RequestContext) {
    try {
      await this.loginAttempts.assertNotBlocked(dto.email, ctx?.ip);
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === 429) {
        this.metrics.incLoginFailed('blocked');
      }
      throw err;
    }

    const user = await this.users.findActiveByEmail(dto.email);

    // Mismo mensaje para "no existe" y "contraseña incorrecta" — evita enumeración.
    if (!user) {
      await this.loginAttempts.registerFailure(dto.email, ctx?.ip);
      this.metrics.incLoginFailed('invalid_credentials');
      await this.audit.log('AUTH_LOGIN_FAILED', {
        actorUserId: null,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
        metadata: { email: dto.email },
      });
      throw new UnauthorizedException({
        message: INVALID_CREDS,
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      await this.loginAttempts.registerFailure(dto.email, ctx?.ip);
      this.metrics.incLoginFailed('invalid_credentials');
      await this.audit.log('AUTH_LOGIN_FAILED', {
        actorUserId: user.id,
        targetUserId: user.id,
        ip: ctx?.ip,
        userAgent: ctx?.userAgent,
      });
      throw new UnauthorizedException({
        message: INVALID_CREDS,
        code: 'AUTH_INVALID_CREDENTIALS',
      });
    }

    await this.loginAttempts.registerSuccess(dto.email, ctx?.ip);
    await this.users.updateLastLogin(user.id);

    this.metrics.incLoginSuccess();

    await this.audit.log('AUTH_LOGIN_SUCCESS', {
      actorUserId: user.id,
      targetUserId: user.id,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = await this.refreshTokenService.issueForUser(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }
}
