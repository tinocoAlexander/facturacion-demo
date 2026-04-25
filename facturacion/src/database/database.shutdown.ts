import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from './database.constants';

@Injectable()
export class DatabaseShutdown implements OnApplicationShutdown {
  constructor(@InjectPool() private readonly pool: Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
