import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dtos';
import { AuthResponseDto, LoginDto, RefreshTokenDto } from './dtos';
import { JwtAuthGuard } from './guards/jwt.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registrar nuevo usuario
   * @param dto - Datos del usuario
   */
  @ApiOperation({ summary: 'Registrar nuevo usuario' })
  // Más estricto que el throttling global
  @Throttle({ default: { ttl: 60_000, limit: 5, blockDuration: 10 * 60_000 } })
  @ApiCreatedResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        email: { type: 'string', example: 'user@example.com' },
        fullName: { type: 'string', example: 'Alex N' },
      },
    },
  })
  @ApiBody({ type: CreateUserDto })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  register(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.authService.register(dto, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  /**
   * Iniciar sesión
   * @param dto - Credenciales
   */
  @ApiOperation({ summary: 'Iniciar sesión' })
  // Más estricto que el throttling global
  @Throttle({ default: { ttl: 60_000, limit: 5, blockDuration: 10 * 60_000 } })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBody({ type: LoginDto })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Request() req: any, @Body() dto: LoginDto) {
    // Express: req.ip depende de trust proxy en producción
    return this.authService.login(dto, req.ip, req.headers?.['user-agent']);
  }

  @ApiOperation({ summary: 'Refrescar sesión (rotación de refresh token)' })
  @Throttle({ default: { ttl: 60_000, limit: 10, blockDuration: 10 * 60_000 } })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBody({ type: RefreshTokenDto })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Request() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto, req.ip, req.headers?.['user-agent']);
  }

  @ApiOperation({ summary: 'Cerrar sesión (revocar refresh token)' })
  @Throttle({ default: { ttl: 60_000, limit: 20, blockDuration: 10 * 60_000 } })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', example: 'Sesión cerrada' } },
    },
  })
  @ApiBody({ type: RefreshTokenDto })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Request() req: any, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto, {
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    });
  }

  /**
   * Obtener perfil del usuario autenticado
   */
  @ApiOperation({ summary: 'Obtener mi perfil' })
  @ApiBearerAuth('bearer')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        email: { type: 'string', example: 'user@example.com' },
        fullName: { type: 'string', example: 'Alex N' },
        role: { type: 'string', example: 'user' },
        isActive: { type: 'boolean', example: true },
        lastLoginAt: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
        updatedAt: { type: 'string' },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.id);
  }
}
