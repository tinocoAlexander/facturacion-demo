import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @ApiOperation({ summary: 'Listar audit logs (admin)' })
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'JWT inválido o ausente' })
  @ApiForbiddenResponse({ description: 'Requiere rol admin' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({
    name: 'action',
    required: false,
    type: String,
    example: 'AUTH_LOGIN_SUCCESS',
  })
  @ApiQuery({ name: 'actorUserId', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'targetUserId', required: false, type: Number, example: 2 })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    example: '2026-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    example: '2026-12-31T23:59:59.999Z',
  })
  @Roles('admin')
  @Get('logs')
  @HttpCode(HttpStatus.OK)
  list(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('actorUserId') actorUserIdRaw?: string,
    @Query('targetUserId') targetUserIdRaw?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const actorUserId = actorUserIdRaw ? Number(actorUserIdRaw) : undefined;
    const targetUserId = targetUserIdRaw ? Number(targetUserIdRaw) : undefined;

    return this.audit.list({
      page,
      limit,
      action,
      actorUserId: Number.isInteger(actorUserId) ? actorUserId : undefined,
      targetUserId: Number.isInteger(targetUserId) ? targetUserId : undefined,
      from,
      to,
    });
  }
}
