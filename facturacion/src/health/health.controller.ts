import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, HttpHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database-health.indicator';

@Controller('health')
export class HealthController {
    
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private dbHealth: DatabaseHealthIndicator,
    ) {}

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.dbHealth.isHealthy('database'),
        ]);
    }
}
