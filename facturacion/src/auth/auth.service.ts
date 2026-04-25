import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from '../users/users.repository';
import { CreateUserDto } from '../users/dtos';
import { LoginDto } from './dtos';
import { JwtPayload } from './strategies/jwt.strategy';
import { LoginAttemptsService } from './security/login-attempts.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtService,
    private readonly loginAttempts: LoginAttemptsService,
  ) {}

  /**
   * Registrar nuevo usuario
   * @param dto - Datos para registrar
   * @returns Usuario creado
   */
  async register(dto: CreateUserDto) {
    const exists = await this.users.emailExists(dto.email);
    if (exists) {
      throw new BadRequestException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const user = await this.users.create(dto.email, passwordHash, dto.fullName);

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
    };
  }

  /**
   * Login de usuario
   * @param dto - Credenciales
   * @returns Token JWT y datos del usuario
   */
  async login(dto: LoginDto, ip?: string) {
    this.loginAttempts.assertNotBlocked(dto.email, ip);

    const user = await this.users.findActiveByEmail(dto.email);

    // Mismo mensaje para "no existe" y "contraseña incorrecta"
    // — evita enumerar qué emails están registrados
    const INVALID_CREDS = 'Credenciales inválidas';

    if (!user) {
      this.loginAttempts.registerFailure(dto.email, ip);
      throw new UnauthorizedException(INVALID_CREDS);
    }

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) {
      this.loginAttempts.registerFailure(dto.email, ip);
      throw new UnauthorizedException(INVALID_CREDS);
    }

    this.loginAttempts.registerSuccess(dto.email, ip);

    await this.users.updateLastLogin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const token = this.jwt.sign(payload);

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
    };
  }

  /**
   * Obtener perfil del usuario
   * @param userId - ID del usuario
   * @returns Datos del usuario
   */
  async getProfile(userId: number) {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return user;
  }
}
