import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import {
  RefreshTokenRow,
  RefreshTokensRepository,
} from '../refresh-tokens.repository';

@Injectable()
export class RefreshTokenService {
  constructor(
    private readonly config: ConfigService,
    private readonly refreshTokens: RefreshTokensRepository,
  ) {}

  hash(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  async issueForUser(userId: number): Promise<string> {
    const token = `rt_${randomBytes(32).toString('base64url')}`;
    const tokenHash = this.hash(token);

    const ttlDays = this.config.get<number>('REFRESH_TOKEN_TTL_DAYS') ?? 7;
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.refreshTokens.insert(userId, tokenHash, expiresAt);
    return token;
  }

  async findByRawToken(
    rawToken: string,
  ): Promise<{ tokenHash: string; stored: RefreshTokenRow | null }> {
    const tokenHash = this.hash(rawToken);
    const stored = await this.refreshTokens.findByHash(tokenHash);
    return { tokenHash, stored };
  }

  async revokeRawToken(rawToken: string): Promise<void> {
    const tokenHash = this.hash(rawToken);
    await this.refreshTokens.revoke(tokenHash);
  }

  async revokeByHash(tokenHash: string): Promise<void> {
    await this.refreshTokens.revoke(tokenHash);
  }

  async rotate(
    oldHash: string,
    newRawToken: string,
  ): Promise<{ newHash: string; newToken: string }> {
    const newHash = this.hash(newRawToken);
    await this.refreshTokens.rotate(oldHash, newHash);
    return { newHash, newToken: newRawToken };
  }

  async revokeAllForUser(userId: number): Promise<void> {
    await this.refreshTokens.revokeAllForUser(userId);
  }
}
