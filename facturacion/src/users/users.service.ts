import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { ChangePasswordDto, CreateUserDto, ResponseUserDto, UpdateProfileDto } from './dtos';
import { User, PublicUser } from './users.types';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * Crear nuevo usuario con hash de contraseña
   * @param createUserDto - Datos para crear el usuario
   * @returns Usuario creado sin información sensible
   */
  async createUser(createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    const { email, password, fullName } = createUserDto;

    // Validar que el email no exista
    const userExists = await this.usersRepository.emailExists(email);
    if (userExists) {
      this.logger.warn(`Intento de crear usuario con email existente: ${email}`);
      throw new ConflictException('El email ya está registrado');
    }

    try {
      // Hash de la contraseña
      const passwordHash = await bcrypt.hash(password, this.BCRYPT_ROUNDS);

      // Crear usuario en BD
      const user = await this.usersRepository.create(
        email,
        passwordHash,
        fullName,
      );

      return this.mapToResponseDto(user);
    } catch (error) {
      this.logger.error(`Error al crear usuario: ${(error as Error).message}`);
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  /**
   * Obtener usuario por ID
   * @param id - ID del usuario
   * @returns Usuario sin información sensible
   */
  async getUserById(id: number): Promise<ResponseUserDto> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('ID inválido');
    }

    const user = await this.usersRepository.findById(id);
    if (!user) {
      this.logger.warn(`Usuario no encontrado: ${id}`);
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Obtener usuario por email (solo para auth interno)
   * @param email - Email del usuario
   * @returns Usuario con hash de contraseña
   */
  async getUserByEmail(email: string): Promise<User | null> {
    if (!email || !this.isValidEmail(email)) {
      throw new BadRequestException('Email inválido');
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
      throw new BadRequestException('Email inválido');
    }

    return this.usersRepository.findActiveByEmail(email);
  }

  /**
   * Actualizar último login del usuario
   * @param id - ID del usuario
   */
  async updateLastLogin(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new BadRequestException('ID inválido');
    }

    try {
      await this.usersRepository.updateLastLogin(id);
    } catch (error) {
      this.logger.error(`Error al actualizar último login: ${(error as Error).message}`);
      // No lanzar error, solo loguear
    }
  }

  /**
   * Cualquier usuario: actualizar su propio perfil
   */
  async updateProfile(userId: number, dto: UpdateProfileDto): Promise<ResponseUserDto> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('ID inválido');
    }

    const updated = await this.usersRepository.updateProfile(userId, dto.fullName);
    if (!updated) throw new NotFoundException('Usuario no encontrado');

    return this.mapToResponseDto(updated);
  }

  /**
   * Cualquier usuario: cambiar su propia contraseña
   */
  async changePassword(userId: number, dto: ChangePasswordDto): Promise<{ message: string }> {
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new BadRequestException('ID inválido');
    }

    const email = await this.getEmailById(userId);
    const user = await this.usersRepository.findByEmail(email);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const currentValid = await bcrypt.compare(dto.currentPassword, user.password_hash);
    if (!currentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
    }

    const newHash = await bcrypt.hash(dto.newPassword, this.BCRYPT_ROUNDS);
    const changed = await this.usersRepository.changePassword(userId, newHash);
    if (!changed) throw new NotFoundException('Usuario no encontrado');

    return { message: 'Contraseña actualizada correctamente' };
  }

  /**
   * Admin: activar o desactivar cualquier usuario
   */
  async setActiveStatus(
    adminId: number,
    targetUserId: number,
    isActive: boolean,
  ): Promise<ResponseUserDto> {
    if (adminId === targetUserId && !isActive) {
      throw new ForbiddenException('No puedes desactivar tu propia cuenta');
    }

    const updated = await this.usersRepository.setActiveStatus(targetUserId, isActive);
    if (!updated) throw new NotFoundException('Usuario no encontrado');

    return this.mapToResponseDto(updated);
  }

  /**
   * Admin: cambiar rol
   */
  async setRole(adminId: number, targetUserId: number, role: string): Promise<ResponseUserDto> {
    if (adminId === targetUserId) {
      throw new ForbiddenException('No puedes cambiar tu propio rol');
    }

    const updated = await this.usersRepository.setRole(targetUserId, role);
    if (!updated) throw new NotFoundException('Usuario no encontrado');

    return this.mapToResponseDto(updated);
  }

  /**
   * Admin: listar usuarios con paginación
   */
  async findAll(page = 1, limit = 20): Promise<{
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
      data: rows.map((u) => this.mapToResponseDto(u)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
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
    } catch (error) {
      this.logger.error('Error validando contraseña');
      return false;
    }
  }

  /**
   * Mapear entidad de usuario a DTO de respuesta
   * @param user - Usuario de BD
   * @returns DTO sin información sensible
   */
  private mapToResponseDto(user: PublicUser | Omit<User, 'password_hash'>): ResponseUserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Validar formato de email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async getEmailById(id: number): Promise<string> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user.email;
  }
}
