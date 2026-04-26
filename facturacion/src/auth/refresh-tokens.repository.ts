import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { REFRESH_TOKEN_QUERIES } from '../database/queries/refresh-tokens.queries';

export type RefreshTokenRow = {
  id: number;
  user_id: number;
  token_hash: string;
  replaced_by_hash: string | null;
  revoked_at: Date | null;
  expires_at: Date;
  created_at: Date;
};

@Injectable()
export class RefreshTokensRepository {
  private readonly logger = new Logger(RefreshTokensRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async insert(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
  ): Promise<number> {
    try {
      const { rows } = await this.pool.query<{ id: number }>(
        REFRESH_TOKEN_QUERIES.INSERT,
        [userId, tokenHash, expiresAt],
      );
      return rows[0].id;
    } catch (err) {
      this.logger.error('insert refresh token failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRow | null> {
    try {
      const { rows } = await this.pool.query<RefreshTokenRow>(
        REFRESH_TOKEN_QUERIES.FIND_BY_HASH,
        [tokenHash],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('find refresh token failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async revoke(tokenHash: string): Promise<void> {
    try {
      await this.pool.query(REFRESH_TOKEN_QUERIES.REVOKE, [tokenHash]);
    } catch (err) {
      this.logger.error('revoke refresh token failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async rotate(oldHash: string, newHash: string): Promise<void> {
    try {
      await this.pool.query(REFRESH_TOKEN_QUERIES.ROTATE, [oldHash, newHash]);
    } catch (err) {
      this.logger.error('rotate refresh token failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async revokeAllForUser(userId: number): Promise<void> {
    try {
      await this.pool.query(REFRESH_TOKEN_QUERIES.REVOKE_ALL_FOR_USER, [
        userId,
      ]);
    } catch (err) {
      this.logger.error('revokeAllForUser failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }
}
