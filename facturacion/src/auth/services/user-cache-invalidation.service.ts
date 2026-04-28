import { Injectable, Logger, Optional } from '@nestjs/common';
import { Redis } from 'ioredis';
import { InjectRedis } from '../../redis/redis.constants';

@Injectable()
export class UserCacheInvalidationService {
  private readonly logger = new Logger(UserCacheInvalidationService.name);

  constructor(
    @Optional()
    @InjectRedis()
    private readonly redis: Redis | null,
  ) {}

  async invalidateUser(userId: number) {
    if (!this.redis) {
      this.logger.warn(
        `Redis no disponible. No se pudo publicar invalidación para usuario ${userId}`,
      );
      return;
    }

    try {
      await this.redis.publish('user:deactivated', userId.toString());
      this.logger.debug(`Publicada invalidación por desactivación: ${userId}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error al publicar en Redis (user:deactivated): ${msg}`,
      );
    }
  }

  async invalidateEmpresaChange(userId: number) {
    if (!this.redis) {
      this.logger.warn(
        `Redis no disponible. No se pudo publicar cambio de empresa para usuario ${userId}`,
      );
      return;
    }

    try {
      await this.redis.publish('user:empresa-changed', userId.toString());
      this.logger.debug(
        `Publicada invalidación por cambio de empresa: ${userId}`,
      );
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error al publicar en Redis (user:empresa-changed): ${msg}`,
      );
    }
  }
}
