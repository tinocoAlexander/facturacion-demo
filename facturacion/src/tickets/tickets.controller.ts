import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import {
  IngestTicketDto,
  QueryTicketDto,
  ResponseTicketDto,
  ResponseTicketDetailDto,
} from './dtos';
import {
  mapToResponseTicketDto,
  mapToResponseTicketDetailDto,
} from './tickets.mapper';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import type { RequestWithTenant } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/guards/roles.guard';
import { TicketStats } from './tickets.types';

@Controller('tickets')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('admin', 'cajero') // Assuming generic roles for POS / ingest users
  @HttpCode(HttpStatus.CREATED)
  async ingestTicket(
    @Request() req: RequestWithTenant,
    @Body() dto: IngestTicketDto,
  ): Promise<ResponseTicketDetailDto> {
    const ticket = await this.ticketsService.ingestTicket(
      req.empresa.id,
      req.user!.id,
      dto,
    );
    return mapToResponseTicketDetailDto(ticket);
  }

  @Get()
  async findAll(
    @Request() req: RequestWithTenant,
    @Query() query: QueryTicketDto,
  ): Promise<{ data: ResponseTicketDto[]; meta: { total: number } }> {
    const { data, total } = await this.ticketsService.findAll(
      req.empresa.id,
      query,
    );
    return {
      data: data.map(mapToResponseTicketDto),
      meta: { total },
    };
  }

  @Get('stats')
  @Roles('admin', 'contador')
  async getStats(@Request() req: RequestWithTenant): Promise<TicketStats> {
    return this.ticketsService.getStats(req.empresa.id);
  }

  @Get(':id')
  async findById(
    @Request() req: RequestWithTenant,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ResponseTicketDetailDto> {
    const ticket = await this.ticketsService.findById(id, req.empresa.id);
    return mapToResponseTicketDetailDto(ticket);
  }

  @Patch(':id/anular')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async anularTicket(
    @Request() req: RequestWithTenant,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.ticketsService.anularTicket(id, req.empresa.id, req.user!.id);
    return { message: 'Ticket anulado correctamente' };
  }
}
