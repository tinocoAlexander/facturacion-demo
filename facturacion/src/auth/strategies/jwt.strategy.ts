import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersRepository } from '../../users/users.repository';

export interface JwtPayload {
  sub: number; // user id
  email: string;
  role: 'user' | 'admin';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly activeCache = new Map<number, { active: boolean; expiry: number }>();
  private readonly CACHE_TTL_MS = 30000;

  constructor(
    config: ConfigService,
    private readonly usersRepository: UsersRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  // Este método corre si el token es válido. Endurecemos verificando que el usuario siga activo.
  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();

    const now = Date.now();
    const cached = this.activeCache.get(payload.sub);

    if (cached && cached.expiry > now) {
      if (!cached.active) {
        throw new UnauthorizedException('La cuenta de usuario está desactivada');
      }
      return { id: payload.sub, email: payload.email, role: payload.role };
    }

    // Consulta ligera (ya optimizada en el repo para traer campos básicos)
    const user = await this.usersRepository.findById(payload.sub);
    
    const isActive = user?.is_active ?? false;
    this.activeCache.set(payload.sub, {
      active: isActive,
      expiry: now + this.CACHE_TTL_MS,
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!isActive) {
      throw new UnauthorizedException('La cuenta de usuario está desactivada');
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
