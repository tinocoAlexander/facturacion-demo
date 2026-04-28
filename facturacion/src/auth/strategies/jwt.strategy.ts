import {
  Inject,
  Injectable,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import Redis from 'ioredis';
import type { IUsersRepository } from '../../users/interfaces/users-repository.interface';
import { I_USERS_REPOSITORY } from '../../users/interfaces/users-repository.interface';

export interface JwtPayload {
  sub: number;
  email: string;
  role: 'user' | 'admin' | 'cajero' | 'contador';
  empresa_id: string | null; // null para admins del sistema
}

@Injectable()
export class JwtStrategy
  extends PassportStrategy(Strategy)
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(JwtStrategy.name);
  private readonly activeCache = new Map<
    number,
    { active: boolean; empresa_id: string | null; expiry: number }
  >();
  private CACHE_TTL_MS = 30000;
  private readonly CACHE_MAX_SIZE = 5000;
  private subscriber: Redis | null = null;

  constructor(
    private readonly config: ConfigService,
    @Inject(I_USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
  ) {
    const publicKey = config.get<string>('JWT_PUBLIC_KEY');
    const secret = config.get<string>('JWT_SECRET');
    const redisUrl = config.get<string>('REDIS_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: (publicKey
        ? publicKey.replace(/\\n/g, '\n')
        : secret) as string,
      algorithms: publicKey ? ['RS256'] : ['HS256'],
    });

    if (!redisUrl) {
      this.logger.warn(
        'REDIS_URL no detectado. Reduciendo TTL de cache a 5s para mitigar riesgos de seguridad.',
      );
      this.CACHE_TTL_MS = 5000;
    }
  }

  async onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (!redisUrl) return;

    try {
      this.subscriber = new Redis(redisUrl, {
        maxRetriesPerRequest: null, // Recomendado para suscripciones
      });

      this.subscriber.on('error', (err) => {
        this.logger.error(`Error en suscriptor Redis: ${err.message}`);
      });

      await this.subscriber.subscribe(
        'user:deactivated',
        'user:empresa-changed',
      );

      this.subscriber.on('message', (channel, message) => {
        const userId = parseInt(message, 10);
        if (!isNaN(userId)) {
          const deleted = this.activeCache.delete(userId);
          if (deleted) {
            this.logger.debug(
              `Cache invalidado reactivamente para usuario ${userId} (canal: ${channel})`,
            );
          }
        }
      });

      this.logger.log(
        'Suscrito a canales de invalidación de cache de usuarios',
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`No se pudo iniciar la suscripción Redis: ${msg}`);
    }
  }

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
    }
  }

  // Este método corre si el token es válido. Endurecemos verificando que el usuario siga activo.
  async validate(payload: JwtPayload) {
    if (!payload.sub) throw new UnauthorizedException();

    const now = Date.now();
    const cached = this.activeCache.get(payload.sub);

    if (cached && cached.expiry > now) {
      // Actualizamos el orden del LRU reinsertando el elemento
      this.activeCache.delete(payload.sub);
      this.activeCache.set(payload.sub, cached);

      if (!cached.active) {
        throw new UnauthorizedException(
          'La cuenta de usuario está desactivada',
        );
      }
      return {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        empresa_id: cached.empresa_id,
      };
    }

    // Consulta ligera (ya optimizada en el repo para traer campos básicos)
    const user = await this.usersRepository.findById(payload.sub);

    const isActive = user?.is_active ?? false;
    const empresaId = user?.empresa_id ?? null;

    // Implementación de LRU: si el cache está lleno, eliminamos el más antiguo (el primero del Map)
    if (
      !this.activeCache.has(payload.sub) &&
      this.activeCache.size >= this.CACHE_MAX_SIZE
    ) {
      const oldestKey = this.activeCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.activeCache.delete(oldestKey);
      }
    }

    this.activeCache.set(payload.sub, {
      active: isActive,
      empresa_id: empresaId,
      expiry: now + this.CACHE_TTL_MS,
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    if (!isActive) {
      throw new UnauthorizedException('La cuenta de usuario está desactivada');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      empresa_id: empresaId,
    };
  }
}
