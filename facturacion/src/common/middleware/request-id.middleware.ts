import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  // Regex para validar UUID v4 (formato estándar)
  private readonly UUID_V4_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  use(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.headers['x-request-id'];

    // Si viene un ID pero no es un UUID válido, lo ignoramos por seguridad
    // para evitar inyecciones o tracking malintencionado.
    const isValidIncoming =
      typeof incomingId === 'string' && this.UUID_V4_REGEX.test(incomingId);

    const requestId = isValidIncoming ? (incomingId as string) : randomUUID();

    // Inyectamos el ID en el request para que esté disponible en logs y filtros
    req['id'] = requestId;

    // Aseguramos que el cliente reciba el ID en el header de respuesta
    res.setHeader('X-Request-Id', requestId);

    next();
  }
}
