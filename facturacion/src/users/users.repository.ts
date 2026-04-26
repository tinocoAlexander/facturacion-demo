import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Pool } from 'pg';
import { InjectPool } from '../database/database.constants';
import { USER_QUERIES } from '../database/queries/users.queries';
import { User, PublicUser } from './users.types';

@Injectable()
export class UsersRepository {
  private readonly logger = new Logger(UsersRepository.name);

  constructor(@InjectPool() private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    try {
      const { rows } = await this.pool.query<User>(USER_QUERIES.FIND_BY_EMAIL, [
        email,
      ]);
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('findByEmail failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findActiveByEmail(email: string): Promise<User | null> {
    try {
      const { rows } = await this.pool.query<User>(
        USER_QUERIES.FIND_ACTIVE_BY_EMAIL,
        [email],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('findActiveByEmail failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findById(id: number): Promise<PublicUser | null> {
    try {
      const { rows } = await this.pool.query<PublicUser>(
        USER_QUERIES.FIND_BY_ID,
        [id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('findById failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async emailExists(email: string): Promise<boolean> {
    const { rows } = await this.pool.query(USER_QUERIES.EMAIL_EXISTS, [email]);
    return rows.length > 0;
  }

  async create(
    email: string,
    passwordHash: string,
    fullName: string,
  ): Promise<PublicUser> {
    try {
      const { rows } = await this.pool.query<PublicUser>(USER_QUERIES.CREATE, [
        email,
        passwordHash,
        fullName,
      ]);
      return rows[0];
    } catch (err) {
      this.logger.error('create user failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.pool.query(USER_QUERIES.UPDATE_LAST_LOGIN, [id]);
  }

  async updateProfile(
    id: number,
    fullName: string,
  ): Promise<PublicUser | null> {
    try {
      const { rows } = await this.pool.query<PublicUser>(
        USER_QUERIES.UPDATE_PROFILE,
        [fullName, id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('updateProfile failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async changePassword(id: number, newPasswordHash: string): Promise<boolean> {
    try {
      const { rows } = await this.pool.query(USER_QUERIES.CHANGE_PASSWORD, [
        newPasswordHash,
        id,
      ]);
      return rows.length > 0;
    } catch (err) {
      this.logger.error('changePassword failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async setActiveStatus(
    id: number,
    isActive: boolean,
  ): Promise<PublicUser | null> {
    try {
      const { rows } = await this.pool.query<PublicUser>(
        USER_QUERIES.SET_ACTIVE_STATUS,
        [isActive, id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('setActiveStatus failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async setRole(id: number, role: string): Promise<PublicUser | null> {
    try {
      const { rows } = await this.pool.query<PublicUser>(
        USER_QUERIES.SET_ROLE,
        [role, id],
      );
      return rows[0] ?? null;
    } catch (err) {
      this.logger.error('setRole failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async findAll(limit: number, offset: number): Promise<PublicUser[]> {
    try {
      const { rows } = await this.pool.query<PublicUser>(
        USER_QUERIES.FIND_ALL_PAGINATED,
        [limit, offset],
      );
      return rows;
    } catch (err) {
      this.logger.error('findAll failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }

  async countAll(): Promise<number> {
    try {
      const { rows } = await this.pool.query<{ total: number }>(
        USER_QUERIES.COUNT_ALL,
      );
      return rows[0]?.total ?? 0;
    } catch (err) {
      this.logger.error('countAll failed', (err as Error).message);
      throw new InternalServerErrorException();
    }
  }
}
