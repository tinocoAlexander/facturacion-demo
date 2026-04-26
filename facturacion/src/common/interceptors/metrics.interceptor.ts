import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../metrics/metrics.service';
import type { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const { method, url } = request;

    // Excluir métricas y salud del tracking
    if (url.startsWith('/metrics') || url.startsWith('/api/v1/health')) {
      return next.handle();
    }

    const start = process.hrtime();

    return next.handle().pipe(
      tap(() => {
        const statusCode = response.statusCode;
        const duration = this.getDurationInSeconds(start);
        
        // Obtenemos el path patrón si está disponible (e.g., /users/:id)
        // En NestJS con Express, está en request.route.path
        const route = (request as any).route?.path || url;

        this.metrics.recordHttpRequest(method, route, statusCode, duration);
      }),
    );
  }

  private getDurationInSeconds(start: [number, number]): number {
    const diff = process.hrtime(start);
    return diff[0] + diff[1] / 1e9;
  }
}
