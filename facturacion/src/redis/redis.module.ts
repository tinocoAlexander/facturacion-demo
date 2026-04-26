import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisShutdown } from './redis.shutdown';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');
        const url = config.get<string>('REDIS_URL');

        if (!url) {
          logger.warn('REDIS_URL not found. Redis features will be disabled (using memory fallback).');
          return null;
        }

        const redis = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        redis.on('error', (err) => {
          logger.error('Redis error:', err.message);
        });

        redis.on('connect', () => {
          logger.log('Connected to Redis');
        });

        return redis;
      },
    },
    RedisShutdown,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
