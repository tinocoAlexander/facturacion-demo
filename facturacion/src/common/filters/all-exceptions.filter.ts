import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import type { Request } from 'express';
import { defaultErrorCodeForStatus } from '../errors/status-codes';
import { getRequestId } from '../request-context/request-context';

type RequestWithUser = Request & {
  id?: string;
  user?: { id?: number; role?: string };
};

interface CommonError {
  message?: string;
  code?: string;
  stack?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<RequestWithUser>();
    const requestId = request?.id || getRequestId();
    const userId = request?.user?.id;

    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const timestamp = new Date().toISOString();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let payload: Record<string, unknown> = {};

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse();

      let basePayload: {
        message?: string | string[];
        code?: string;
        [key: string]: unknown;
      };

      if (typeof response === 'string') {
        basePayload = { message: response };
      } else {
        basePayload = response as {
          message?: string | string[];
          code?: string;
          [key: string]: unknown;
        };
      }

      payload = {
        statusCode,
        code:
          typeof basePayload.code === 'string'
            ? basePayload.code
            : defaultErrorCodeForStatus(statusCode),
        ...basePayload,
      };
    } else {
      // Error no controlado (DB, etc.)
      const error = exception as CommonError;

      this.logger.error(
        {
          err: isProduction ? undefined : exception,
          message: error.message,
          requestId,
          userId,
          path: request?.url,
        },
        'Unhandled exception',
      );

      payload = {
        statusCode,
        code: 'INTERNAL_SERVER_ERROR',
        message: this.sanitizeErrorMessage(error, isProduction),
      };
    }

    // Aseguramos que requestId esté siempre en la respuesta
    httpAdapter.reply(
      ctx.getResponse(),
      {
        ...payload,
        timestamp,
        path: request.url,
        requestId,
      },
      statusCode,
    );
  }

  private sanitizeErrorMessage(
    error: CommonError,
    isProduction: boolean,
  ): string {
    if (!isProduction) return error.message || 'Internal server error';

    // En producción, si detectamos que es un error de DB (e.g., de 'pg'),
    // devolvemos un mensaje genérico para no exponer esquema.
    const dbErrorKeywords = [
      'query',
      'select',
      'insert',
      'update',
      'delete',
      'constraint',
      'relation',
      'column',
    ];
    const msg = (error.message || '').toLowerCase();

    if (
      dbErrorKeywords.some((keyword) => msg.includes(keyword)) ||
      error.code
    ) {
      return 'Se produjo un error al procesar la solicitud en el servidor de datos';
    }

    return 'Internal server error';
  }
}
