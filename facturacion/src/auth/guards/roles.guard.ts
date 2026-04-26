import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuditService } from '../../audit/audit.service';

type RequestWithUser = Request & {
  user?: { id?: number; role?: string };
  id?: string;
};

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(
    private reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user } = request;

    const role = user?.role;
    if (!role || !requiredRoles.includes(role)) {
      const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
      const userId = user?.id;
      const path = request.url;

      const ipStr = String(ip);
      this.logger.warn(
        `Acceso denegado: IP=${ipStr}, UserID=${userId ?? 'guest'}, Path=${path}, Requiere=${requiredRoles.join(', ')}`,
      );

      // Registro persistente del fallo de autorización
      await this.audit.log('AUTHZ_FORBIDDEN', {
        actorUserId: userId,
        ip: String(ip),
        metadata: {
          path,
          requiredRoles,
          userRole: role,
          requestId: request.id,
        },
      });

      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    return true;
  }
}
