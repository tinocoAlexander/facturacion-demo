import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { AuditService } from '../../audit/audit.service';
import {
  I_EMPRESAS_REPOSITORY,
} from '../../empresas/interfaces/empresas-repository.interface';
import type { IEmpresasRepository } from '../../empresas/interfaces/empresas-repository.interface';
import { Empresa } from '../../empresas/empresas.types';

type RequestWithUser = Request & {
  user?: { id: number; email: string; role: string; empresa_id: string | null };
};

export type RequestWithTenant = RequestWithUser & {
  empresa: Empresa;
};

@Injectable()
export class TenantGuard implements CanActivate {
  // LRU cache — mismo patrón que JwtStrategy.activeCache
  private readonly cache = new Map<
    string,
    { empresa: Empresa; expiry: number }
  >();
  private readonly CACHE_TTL_MS = 30_000; // 30 segundos
  private readonly CACHE_MAX = 1_000; // máximo 1000 empresas en memoria

  constructor(
    @Inject(I_EMPRESAS_REPOSITORY)
    private readonly empresas: IEmpresasRepository,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const empresaId = request.user?.empresa_id;

    if (!empresaId) {
      throw new ForbiddenException({
        message: 'Este endpoint requiere pertenecer a una empresa',
        code: 'TENANT_REQUIRED',
      });
    }

    const empresa = await this.getEmpresa(empresaId);

    if (!empresa) {
      throw new ForbiddenException({
        message: 'La empresa no existe o no está disponible',
        code: 'TENANT_NOT_FOUND',
      });
    }

    if (!empresa.is_active) {
      throw new ForbiddenException({
        message: 'La empresa está inactiva',
        code: 'TENANT_INACTIVE',
      });
    }

    // Disponible para controllers: @Request() req → req.empresa
    (request as any)['empresa'] = empresa;
    return true;
  }

  private async getEmpresa(empresaId: string): Promise<Empresa | null> {
    const now = Date.now();
    const cached = this.cache.get(empresaId);
    if (cached && cached.expiry > now) return cached.empresa;

    const empresa = await this.empresas.findById(empresaId);

    // LRU: si lleno, eliminar el más antiguo
    if (this.cache.size >= this.CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }

    if (empresa) {
      this.cache.set(empresaId, { empresa, expiry: now + this.CACHE_TTL_MS });
    }

    return empresa;
  }
}
