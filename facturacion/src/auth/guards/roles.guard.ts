import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

type RequestWithUser = Request & { user?: { role?: string } };

export const ROLES_KEY = 'roles';

// Decorador que usarás en los controllers: @Roles('admin')
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>(
      ROLES_KEY,
      context.getHandler(),
    );

    // Si el endpoint no tiene @Roles(), cualquiera puede acceder
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    const role = user?.role;
    if (!role || !requiredRoles.includes(role)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }

    return true;
  }
}
