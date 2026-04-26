import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import {
  ChangePasswordDto,
  CreateUserDto,
  ResponseUserDto,
  UpdateProfileDto,
} from './dtos';
import { User } from './users.types';
import { UsersAdminService } from './services/users-admin.service';
import { UsersSelfService } from './services/users-self.service';
import { mapToResponseUserDto } from './users.mapper';
import { httpError } from '../common/errors/http-error';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersAdmin: UsersAdminService,
    private readonly usersSelf: UsersSelfService,
  ) {}

  /**
   * Crear nuevo usuario con hash de contraseña
   * @param createUserDto - Datos para crear el usuario
   * @returns Usuario creado sin información sensible
   */
  async createUser(
    createUserDto: CreateUserDto,
    ctx?: { actorUserId?: number; ip?: string; userAgent?: string },
  ): Promise<ResponseUserDto> {
    return this.usersAdmin.createUser(createUserDto, ctx);
  }

  /**
   * Obtener usuario por ID
   * @param id - ID del usuario
   * @returns Usuario sin información sensible
   */
  async getUserById(id: number): Promise<ResponseUserDto> {
    if (!Number.isInteger(id) || id <= 0) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_INVALID_ID',
        'ID inválido',
      );
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${id}`);
      throw httpError(
        HttpStatus.NOT_FOUND,
        'USERS_NOT_FOUND',
        'Usuario no encontrado',
      );
    }

    return mapToResponseUserDto(user);
  }

  /**
   * Obtener usuario por email (solo para auth interno)
   * @param email - Email del usuario
   * @returns Usuario con hash de contraseña
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || !this.isValidEmail(email)) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_EMAIL_INVALID',
        'Email inválido',
      );
    }

    return this.usersRepository.findByEmail(email);
  }

  /**
   * Obtener usuario activo por email (para login)
   * @param email - Email del usuario
   * @returns Usuario activo con hash de contraseña
   */
  async getActiveUserByEmail(email: string): Promise<User | null> {
    if (!email || !this.isValidEmail(email)) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_EMAIL_INVALID',
        'Email inválido',
      );
    }

    return this.usersRepository.findActiveByEmail(email);
  }

  /**
   * Actualizar último login del usuario
   * @param id - ID del usuario
   */
  async updateLastLogin(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'USERS_INVALID_ID',
        'ID inválido',
      );
    }

    try {
      await this.usersRepository.updateLastLogin(id);
    } catch (error) {
      this.logger.error(
        `Error al actualizar último login: ${(error as Error).message}`,
      );
      // No lanzar error, solo loguear
    }
  }

  /**
   * Cualquier usuario: actualizar su propio perfil
   */
  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<ResponseUserDto> {
    return this.usersSelf.updateProfile(userId, dto);
  }

  /**
   * Cualquier usuario: cambiar su propia contraseña
   */
  async changePassword(
    userId: number,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.usersSelf.changePassword(userId, dto);
  }

  /**
   * Admin: activar o desactivar cualquier usuario
   */
  async setActiveStatus(
    adminId: number,
    targetUserId: number,
    isActive: boolean,
  ): Promise<ResponseUserDto> {
    return this.usersAdmin.setActiveStatus(adminId, targetUserId, isActive);
  }

  /**
   * Admin: cambiar rol
   */
  async setRole(
    adminId: number,
    targetUserId: number,
    role: string,
  ): Promise<ResponseUserDto> {
    return this.usersAdmin.setRole(adminId, targetUserId, role);
  }

  /**
   * Admin: listar usuarios con paginación
   */
  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ResponseUserDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.usersAdmin.findAll(page, limit);
  }

  /**
   * Validar contraseña contra hash
   * @param password - Contraseña en texto plano
   * @param hash - Hash de la contraseña
   * @returns true si la contraseña es correcta
   */
  async validatePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch {
      this.logger.error('Error validando contraseña');
      return false;
    }
  }

  /**
   * Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
