import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(AllExceptionsFilter.name);
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<any>();
    const requestId = request?.id;
    const userId = request?.user?.id;

    const timestamp = new Date().toISOString();

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      const payload =
        typeof response === 'string'
          ? { statusCode, message: response }
          : (response as Record<string, any>);

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
      return;
    }

    const statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    const message = 'Internal server error';

    const err = exception as any;
    this.logger.error(
      {
        err,
        requestId,
        userId,
        path: request?.url,
        method: request?.method,
      },
      'Unhandled exception',
    );

    httpAdapter.reply(
      ctx.getResponse(),
      {
        statusCode,
        message,
        timestamp,
        path: request.url,
        requestId,
      },
      statusCode,
    );
  }
}
