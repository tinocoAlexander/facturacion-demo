import { Controller, Get } from '@nestjs/common';
import {
  HealthCheckService,
  HttpHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.indicator';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private dbHealth: DatabaseHealthIndicator,
  ) {}

  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({ description: 'Estado de salud del servicio y dependencias' })
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([() => this.dbHealth.isHealthy('database')]);
  }
}
