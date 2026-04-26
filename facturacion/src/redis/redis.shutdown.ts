import { Injectable, OnApplicationShutdown, Optional } from '@nestjs/common';
import Redis from 'ioredis';
import { InjectRedis } from './redis.constants';

@Injectable()
export class RedisShutdown implements OnApplicationShutdown {
  constructor(@Optional() @InjectRedis() private readonly redis: Redis | null) {}

  async onApplicationShutdown() {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
