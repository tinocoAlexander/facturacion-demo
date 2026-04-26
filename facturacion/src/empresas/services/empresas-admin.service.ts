import { Injectable, Logger, HttpStatus, Inject } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { CreateEmpresaDto, ResponseEmpresaDto } from '../dtos';
import { I_EMPRESAS_REPOSITORY } from '../interfaces/empresas-repository.interface';
import type { IEmpresasRepository } from '../interfaces/empresas-repository.interface';
import { mapToResponseEmpresaDto } from '../empresas.mapper';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class EmpresasAdminService {

  constructor(
    @Inject(I_EMPRESAS_REPOSITORY)
    private readonly repo: IEmpresasRepository,
    private readonly audit: AuditService,
  ) {}

  async crear(
    dto: CreateEmpresaDto,
    actorUserId: number,
  ): Promise<ResponseEmpresaDto> {
    const exists = await this.repo.rfcExists(dto.rfc);
    if (exists) {
      throw httpError(
        HttpStatus.CONFLICT,
        'EMPRESAS_RFC_DUPLICADO',
        'El RFC ya está registrado',
      );
    }

    const empresa = await this.repo.create(dto);

    await this.audit.log('ADMIN_CREATE_EMPRESA', {
      actorUserId,
      metadata: { rfc: empresa.rfc, id: empresa.id },
    });

    return mapToResponseEmpresaDto(empresa);
  }

  async setActivo(
    adminId: number,
    empresaId: string,
    isActive: boolean,
  ): Promise<ResponseEmpresaDto> {
    const updated = await this.repo.setActive(empresaId, isActive);
    if (!updated) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'EMPRESAS_NOT_FOUND',
        'Empresa no encontrada',
      );
    }

    await this.audit.log('ADMIN_SET_EMPRESA_ACTIVE', {
      actorUserId: adminId,
      metadata: { empresaId, isActive },
    });

    return mapToResponseEmpresaDto(updated);
  }

  async listar(
    page = 1,
    limit = 20,
  ): Promise<{
    data: ResponseEmpresaDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.repo.findAll(safeLimit, offset),
      this.repo.countAll(),
    ]);

    return {
      data: rows.map((e) => mapToResponseEmpresaDto(e)),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }

  async asignarUsuario(
    adminId: number,
    empresaId: string,
    userId: number,
  ): Promise<void> {
    const empresa = await this.repo.findById(empresaId);
    if (!empresa) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'EMPRESAS_NOT_FOUND',
        'Empresa no encontrada',
      );
    }

    const assignedEmpresa = await this.repo.findByUser(userId);
    if (assignedEmpresa) {
      throw httpError(
        HttpStatus.CONFLICT,
        'EMPRESAS_USER_ALREADY_ASSIGNED',
        'El usuario ya pertenece a otra empresa',
      );
    }

    await this.repo.assignUser(empresaId, userId);

    await this.audit.log('ADMIN_ASSIGN_USER_EMPRESA', {
      actorUserId: adminId,
      metadata: { empresaId, userId },
    });
  }
}
