import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CatalogosService } from './catalogos.service';
import { CatalogosSyncService } from './services/catalogos-sync.service';
import { QueryCatalogoSearchDto, QueryCatalogoRegimenDto } from './dtos';
import { Throttle } from '@nestjs/throttler';

@ApiTags('catalogos')
@Controller('catalogos')
export class CatalogosController {
  constructor(
    private readonly catalogosService: CatalogosService,
    private readonly syncService: CatalogosSyncService,
  ) {}

  @Get('productos')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'Búsqueda de productos y servicios (c_ClaveProdServ)',
  })
  async searchProductos(@Query() query: QueryCatalogoSearchDto) {
    if (!query.q || query.q.length < 3) {
      return [];
    }
    return this.catalogosService.searchClaveProdServ(query.q, query.limit);
  }

  @Get('unidades')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Búsqueda de unidades de medida (c_ClaveUnidad)' })
  async searchUnidades(@Query() query: QueryCatalogoSearchDto) {
    if (!query.q) {
      return [];
    }
    return this.catalogosService.searchClaveUnidad(query.q, query.limit);
  }

  @Get('uso-cfdi')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Listar usos de CFDI' })
  async getUsoCfdi() {
    return this.catalogosService.getUsoCfdi();
  }

  @Get('forma-pago')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Listar formas de pago' })
  async getFormaPago() {
    return this.catalogosService.getFormaPago();
  }

  @Get('regimen-fiscal')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Listar regímenes fiscales' })
  async getRegimenFiscal(@Query() query: QueryCatalogoRegimenDto) {
    return this.catalogosService.getRegimenFiscal(query.tipo);
  }

  @Get('metodo-pago')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Listar métodos de pago' })
  async getMetodoPago() {
    return this.catalogosService.getMetodoPago();
  }

  @Get('tipo-relacion')
  @Throttle({ default: { ttl: 60_000, limit: 60 } })
  @ApiOperation({ summary: 'Listar tipos de relación' })
  async getTipoRelacion() {
    return this.catalogosService.getTipoRelacion();
  }

  // --- Endpoints de Administración ---

  @Post('sync')
  @ApiBearerAuth('bearer')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({
    summary: 'Forzar sincronización de catálogos (solo admin)',
  })
  async syncCatalogos() {
    await this.syncService.syncAll();
    return { success: true, message: 'Sincronización de catálogos finalizada' };
  }
}
