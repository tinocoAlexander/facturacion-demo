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
          logger.warn(
            'REDIS_URL not found. Redis features will be disabled (using memory fallback).',
          );
          return null;
        }

        const redis = new Redis(url, {
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        let lastErrorLogTime = 0;
        const ERROR_LOG_THROTTLE_MS = 5000;

        redis.on('error', (err) => {
          const now = Date.now();
          if (now - lastErrorLogTime > ERROR_LOG_THROTTLE_MS) {
            logger.error(`Redis error: ${err.message}`);
            lastErrorLogTime = now;
          }
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
