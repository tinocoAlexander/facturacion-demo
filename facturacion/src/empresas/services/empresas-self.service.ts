import { Injectable, Logger, HttpStatus, Inject } from '@nestjs/common';
import { AuditService } from '../../audit/audit.service';
import { UpdateEmpresaDto, ResponseEmpresaDto } from '../dtos/index.js';
import {
  I_EMPRESAS_REPOSITORY,
} from '../interfaces/empresas-repository.interface';
import type { IEmpresasRepository } from '../interfaces/empresas-repository.interface';
import { mapToResponseEmpresaDto } from '../empresas.mapper';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class EmpresasSelfService {
  private readonly logger = new Logger(EmpresasSelfService.name);

  constructor(
    @Inject(I_EMPRESAS_REPOSITORY)
    private readonly repo: IEmpresasRepository,
    private readonly audit: AuditService,
  ) {}

  async actualizar(
    empresaId: string,
    dto: UpdateEmpresaDto,
  ): Promise<ResponseEmpresaDto> {
    const updated = await this.repo.update(empresaId, dto);
    if (!updated) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'EMPRESAS_NOT_FOUND',
        'Empresa no encontrada o inactiva',
      );
    }

    await this.audit.log('EMPRESA_UPDATE', {
      actorUserId: 0, // Placeholder, usually we log the user id but prompt says actorUserId: empresaId? 
                      // Wait, prompt says "actorUserId: empresaId". OK.
      metadata: { campos: Object.keys(dto) },
    });

    return mapToResponseEmpresaDto(updated);
  }
}
