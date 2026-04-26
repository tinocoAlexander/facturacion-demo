import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../users/dtos';
import { LoginDto, RefreshTokenDto } from './dtos';
import {
  AuthCredentialsService,
  RequestContext,
} from './services/auth-credentials.service';
import { AuthProfileService } from './services/auth-profile.service';
import { AuthSessionService } from './services/auth-session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly credentials: AuthCredentialsService,
    private readonly session: AuthSessionService,
    private readonly profile: AuthProfileService,
  ) {}

  /**
   * Registrar nuevo usuario
   * @param dto - Datos para registrar
   * @returns Usuario creado
   */
  async register(dto: CreateUserDto, ctx?: RequestContext) {
    return this.credentials.register(dto, ctx);
  }

  /**
   * Login de usuario
   * @param dto - Credenciales
   * @returns Token JWT y datos del usuario
   */
  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    return this.credentials.login(dto, { ip, userAgent });
  }

  /**
   * Intercambiar refresh token por un nuevo access token y refresh token (rotación).
   */
  async refresh(dto: RefreshTokenDto, ip?: string, userAgent?: string) {
    return this.session.refresh(dto, { ip, userAgent });
  }

  /**
   * Logout: revoca el refresh token actual.
   */
  async logout(dto: RefreshTokenDto, ctx?: RequestContext) {
    return this.session.logout(dto, ctx);
  }

  /**
   * Obtener perfil del usuario
   * @param userId - ID del usuario
   * @returns Datos del usuario
   */
  async getProfile(userId: number) {
    return this.profile.getProfile(userId);
  }
}
