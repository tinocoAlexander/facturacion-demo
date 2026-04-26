import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';

export function configureSecurity(app: INestApplication) {
  // Headers de seguridad HTTP (XSS, clickjacking, etc.)
  app.use(helmet());
}
