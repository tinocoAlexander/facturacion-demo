import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { UsersService } from './users.service';
import {
  ChangePasswordDto,
  CreateUserDto,
  ResponseUserDto,
  SetActiveDto,
  SetRoleDto,
  UpdateProfileDto,
} from './dtos';

@ApiTags('users')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'Crear nuevo usuario (admin)' })
  @ApiCreatedResponse({ type: ResponseUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<ResponseUserDto> {
    return this.usersService.createUser(createUserDto);
  }

  @ApiOperation({ summary: 'Obtener usuario por ID (admin)' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiParam({ name: 'id', type: Number })
  @Roles('admin')
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseUserDto> {
    return this.usersService.getUserById(id);
  }

  @ApiOperation({ summary: 'Listar usuarios con paginación (admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/ResponseUserDto' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 100 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 20 },
            totalPages: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @Roles('admin')
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @ApiOperation({ summary: 'Actualizar mi perfil' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiBody({ type: UpdateProfileDto })
  @Patch('me/profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Cambiar mi contraseña' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { message: { type: 'string', example: 'Contraseña actualizada correctamente' } },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiBody({ type: ChangePasswordDto })
  @Patch('me/password')
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Activar o desactivar usuario (admin)' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: SetActiveDto })
  @Roles('admin')
  @Patch(':id/active')
  setActive(
    @Request() req: any,
    @Param('id', ParseIntPipe) targetId: number,
    @Body() dto: SetActiveDto,
  ) {
    return this.usersService.setActiveStatus(req.user.id, targetId, dto.isActive);
  }

  @ApiOperation({ summary: 'Cambiar rol de usuario (admin)' })
  @ApiOkResponse({ type: ResponseUserDto })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: SetRoleDto })
  @Roles('admin')
  @Patch(':id/role')
  setRole(
    @Request() req: any,
    @Param('id', ParseIntPipe) targetId: number,
    @Body() dto: SetRoleDto,
  ) {
    return this.usersService.setRole(req.user.id, targetId, dto.role);
  }
}
