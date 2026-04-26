import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CsdsUploadService } from './services/csds-upload.service';
import { I_CSD_REPOSITORY } from './interfaces/csds-repository.interface';
import type { ICsdRepository } from './interfaces/csds-repository.interface';
import { ResponseCsdDto } from './dtos';
import { mapToResponseCsdDto } from './csds.mapper';
import { httpError } from '../common/errors/http-error';
import { MulterFile } from './csds.types';

@Injectable()
export class CsdsService {
  constructor(
    private readonly uploadService: CsdsUploadService,
    @Inject(I_CSD_REPOSITORY) private readonly repo: ICsdRepository,
    private readonly audit: AuditService,
  ) {}

  async uploadCsd(
    empresaId: string,
    cerFile: MulterFile,
    keyFile: MulterFile,
    passwordPlain: string,
    actorUserId: number,
  ): Promise<ResponseCsdDto> {
    const csd = await this.uploadService.processAndSave(
      empresaId,
      cerFile,
      keyFile,
      passwordPlain,
    );

    await this.audit.log('CSD_UPLOAD', {
      actorUserId,
      metadata: { empresaId, csdId: csd.id, noCertificado: csd.no_certificado },
    });

    return mapToResponseCsdDto(csd);
  }

  async getActiveCsd(empresaId: string): Promise<ResponseCsdDto> {
    const csd = await this.repo.findActiveByEmpresa(empresaId);
    if (!csd) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'CSD_NOT_FOUND',
        'No hay un CSD activo para esta empresa',
      );
    }
    return mapToResponseCsdDto(csd);
  }

  async activarCsd(
    empresaId: string,
    csdId: string,
    actorUserId: number,
  ): Promise<void> {
    const csd = await this.repo.findById(csdId, empresaId);
    if (!csd) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'CSD_NOT_FOUND',
        'CSD no encontrado o no pertenece a esta empresa',
      );
    }

    await this.repo.setActive(csdId, empresaId);

    await this.audit.log('CSD_ACTIVATE', {
      actorUserId,
      metadata: { empresaId, csdId },
    });
  }

  async listar(
    empresaId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    data: ResponseCsdDto[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const offset = (safePage - 1) * safeLimit;

    const [rows, total] = await Promise.all([
      this.repo.findAllByEmpresa(empresaId, safeLimit, offset),
      this.repo.countAllByEmpresa(empresaId),
    ]);

    return {
      data: rows.map(mapToResponseCsdDto),
      meta: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  }
}
