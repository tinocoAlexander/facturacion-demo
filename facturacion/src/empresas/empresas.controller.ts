import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import type { RequestWithTenant } from '../auth/guards/tenant.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/users.types';
import { EmpresasService } from './empresas.service';
import {
  CreateEmpresaDto,
  UpdateEmpresaDto,
  ResponseEmpresaDto,
  AssignUserDto,
  SetActiveDto,
} from './dtos';
import { mapToResponseEmpresaDto } from './empresas.mapper';

@ApiTags('empresas')
@ApiBearerAuth('bearer')
@Controller('empresas')
export class EmpresasController {
  constructor(private readonly empresas: EmpresasService) {}

  // ── RUTAS ADMIN ──────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear empresa (admin)' })
  @ApiCreatedResponse({ type: ResponseEmpresaDto })
  crear(@CurrentUser() user: User, @Body() dto: CreateEmpresaDto) {
    return this.empresas.crear(dto, user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Listar todas las empresas (admin)' })
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.empresas.listar(page, limit);
  }

  // ── RUTAS TENANT (el usuario ve su propia empresa) ─

  @Get('mi-empresa')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Ver mi empresa' })
  getMiEmpresa(@Request() req: RequestWithTenant) {
    // TenantGuard ya resolvió la empresa y la adjuntó al request
    return mapToResponseEmpresaDto(req.empresa);
  }

  @Patch('mi-empresa')
  @UseGuards(JwtAuthGuard, TenantGuard)
  @ApiOperation({ summary: 'Actualizar mi empresa' })
  actualizarMiEmpresa(
    @Request() req: RequestWithTenant,
    @Body() dto: UpdateEmpresaDto,
  ) {
    return this.empresas.actualizar(req.empresa.id, dto);
  }

  // ── RUTAS ADMIN (CONTINUACIÓN) ──────────────────

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Ver empresa por ID (admin)' })
  buscarPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.empresas.buscarPorId(id);
  }

  @Patch(':id/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Activar/desactivar empresa (admin)' })
  setActivo(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.empresas.setActivo(user.id, id, dto.isActive);
  }

  @Post(':id/usuarios')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Asignar usuario a empresa (admin)' })
  asignarUsuario(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) empresaId: string,
    @Body() dto: AssignUserDto,
  ) {
    return this.empresas.asignarUsuario(user.id, empresaId, dto.userId);
  }
}
