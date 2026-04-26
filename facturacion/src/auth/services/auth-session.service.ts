import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuditService } from '../../audit/audit.service';
import { UsersRepository } from '../../users/users.repository';
import { MetricsService } from '../../metrics/metrics.service';
import { RefreshTokenDto } from '../dtos';
import { JwtPayload } from '../strategies/jwt.strategy';
import { RequestContext } from './auth-credentials.service';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthSessionService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly audit: AuditService,
    private readonly metrics: MetricsService,
  ) {}

  async refresh(dto: RefreshTokenDto, ctx?: RequestContext) {
    const { tokenHash, stored } = await this.refreshTokenService.findByRawToken(
      dto.refreshToken,
    );
    if (!stored) {
      this.metrics.incRefreshFailed('invalid_token');
      throw new UnauthorizedException({
        message: 'Refresh token inválido',
        code: 'AUTH_REFRESH_INVALID',
      });
    }

    if (stored.revoked_at) {
      this.metrics.incRefreshFailed('revoked');
      throw new UnauthorizedException({
        message: 'Refresh token revocado',
        code: 'AUTH_REFRESH_REVOKED',
      });
    }

    if (stored.expires_at.getTime() <= Date.now()) {
      await this.refreshTokenService.revokeByHash(tokenHash);
      this.metrics.incRefreshFailed('expired');
      throw new UnauthorizedException({
        message: 'Refresh token expirado',
        code: 'AUTH_REFRESH_EXPIRED',
      });
    }

    const user = await this.users.findById(stored.user_id);
    if (!user || !user.is_active) {
      await this.refreshTokenService.revokeAllForUser(stored.user_id);
      this.metrics.incRefreshFailed('user_invalid');
      throw new UnauthorizedException({
        message: 'Usuario inválido',
        code: 'AUTH_REFRESH_USER_INVALID',
      });
    }

    // Issue new token + rotate
    const newRefreshToken = await this.refreshTokenService.issueForUser(
      user.id,
    );
    await this.refreshTokenService.rotate(tokenHash, newRefreshToken);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwt.sign(payload);

    await this.audit.log('AUTH_REFRESH', {
      actorUserId: user.id,
      targetUserId: user.id,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });

    this.metrics.incRefreshSuccess();

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  async logout(dto: RefreshTokenDto, ctx?: RequestContext) {
    await this.refreshTokenService.revokeRawToken(dto.refreshToken);
    await this.audit.log('AUTH_LOGOUT', {
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
    });
    return { message: 'Sesión cerrada' };
  }
}
