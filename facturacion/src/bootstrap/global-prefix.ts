import type { INestApplication } from '@nestjs/common';
import { RequestMethod } from '@nestjs/common';

export function configureGlobalPrefix(app: INestApplication) {
  // Prefijo global — todos tus endpoints serán /api/v1/...
  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'metrics', method: RequestMethod.GET }],
  });
}
