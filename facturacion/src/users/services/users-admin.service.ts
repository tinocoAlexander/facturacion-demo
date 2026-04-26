import { Injectable, Logger, HttpStatus, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../../audit/audit.service';
import { CreateUserDto, ResponseUserDto } from '../dtos';
import type { IUsersRepository } from '../interfaces/users-repository.interface';
import { I_USERS_REPOSITORY } from '../interfaces/users-repository.interface';
import { mapToResponseUserDto } from '../users.mapper';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class UsersAdminService {
  private readonly logger = new Logger(UsersAdminService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @Inject(I_USERS_REPOSITORY)
    private readonly usersRepository: IUsersRepository,
    private readonly audit: AuditService,
  ) {}

  async createUser(
    dto: CreateUserDto,
    ctx?: { actorUserId?: number; ip?: string; userAgent?: string },
  ): Promise<ResponseUserDto> {
    const { email, password, fullName } = dto;

    const userExists = await this.usersRepository.emailExists(email);
    if (userExists) {
      this.logger.warn(
        `Intento de crear usuario con email existente: ${email}`,
      );
      throw httpError(
        HttpStatus.CONFLICT,
        'USERS_EMAIL_ALREADY_REGISTERED',
        'El email ya está registrado',
      );
    }

    const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);
    const user = await this.usersRepository.create(
      email,
      passwordHash,
      fullName,
    );

    await this.audit.log('ADMIN_CREATE_USER', {
      actorUserId: ctx?.actorUserId ?? null,
      targetUserId: user.id,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      metadata: { email: user.email },
    });

    return mapToResponseUserDto(user);
  }

  async setActiveStatus(
    adminId: number,
    targetUserId: number,
    isActive: boolean,
  ): Promise<ResponseUserDto> {
    if (adminId === targetUserId && !isActive) {
      throw httpError(
        HttpStatus.FORBIDDEN,
        'USERS_CANNOT_DEACTIVATE_SELF',
        'No puedes desactivar tu propia cuenta',
      );
    }

    const updated = await this.usersRepository.setActiveStatus(
      targetUserId,
      isActive,
    );
    if (!updated)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    await this.audit.log('ADMIN_SET_ACTIVE', {
      actorUserId: adminId,
      targetUserId,
      metadata: { isActive },
    });

    return mapToResponseUserDto(updated);
  }

  async setRole(
    adminId: number,
    targetUserId: number,
    role: string,
  ): Promise<ResponseUserDto> {
    if (adminId === targetUserId) {
      throw httpError(
        HttpStatus.FORBIDDEN,
        'USERS_CANNOT_CHANGE_SELF_ROLE',
        'No puedes cambiar tu propio rol',
      );
    }

    const updated = await this.usersRepository.setRole(targetUserId, role);
    if (!updated)
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );

    await this.audit.log('ADMIN_SET_ROLE', {
      actorUserId: adminId,
      targetUserId,
      metadata: { role },
    });

    return mapToResponseUserDto(updated);
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ResponseUserDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.usersRepository.findAll(safeLimit, offset),
      this.usersRepository.countAll(),
    ]);

    return {
      data: rows.map((u) => mapToResponseUserDto(u)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
