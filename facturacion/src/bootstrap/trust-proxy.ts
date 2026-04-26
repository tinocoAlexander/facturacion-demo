import type { INestApplication } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';

export function configureTrustProxy(
  app: INestApplication,
  config: ConfigService,
) {
  const trustProxyRaw: unknown = config.get('TRUST_PROXY');
  const trustProxy = trustProxyRaw === true || trustProxyRaw === 'true';
  if (trustProxy) {
    // Necesario si estás detrás de reverse proxy (Nginx/Traefik) para que req.ip sea correcto.
    const instance = app.getHttpAdapter().getInstance() as {
      set: (key: string, value: unknown) => void;
    };
    instance.set('trust proxy', 1);
  }
}
