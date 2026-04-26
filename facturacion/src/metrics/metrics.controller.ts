import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getMetrics(@Res() res: Response) {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    const isProduction = nodeEnv === 'production';

    const enabledRaw = this.config.get('METRICS_ENABLED');
    const enabled =
      enabledRaw === true ||
      enabledRaw === 'true' ||
      (!isProduction && enabledRaw !== false && enabledRaw !== 'false');

    // En prod: si explícitamente se habilita, exigimos BasicAuth via main.ts.
    // Aquí además “apagamos” el endpoint si faltan credenciales (fail-closed).
    if (enabled && isProduction) {
      const u = this.config.get<string>('METRICS_BASIC_USER');
      const p = this.config.get<string>('METRICS_BASIC_PASSWORD');
      if (!u || !p) {
        throw new NotFoundException();
      }
    }

    if (!enabled) throw new NotFoundException();

    res.setHeader('Content-Type', this.metrics.contentType);
    res.send(await this.metrics.metrics());
  }
}
