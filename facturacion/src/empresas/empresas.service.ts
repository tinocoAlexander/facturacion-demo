import { Injectable, HttpStatus, Inject } from '@nestjs/common';
import { EmpresasAdminService } from './services/empresas-admin.service';
import { EmpresasSelfService } from './services/empresas-self.service';
import {
  CreateEmpresaDto,
  UpdateEmpresaDto,
  ResponseEmpresaDto,
} from './dtos';
import { I_EMPRESAS_REPOSITORY } from './interfaces/empresas-repository.interface';
import type { IEmpresasRepository } from './interfaces/empresas-repository.interface';
import { mapToResponseEmpresaDto } from './empresas.mapper';
import { httpError } from '../common/errors/http-error';

@Injectable()
export class EmpresasService {
  constructor(
    private readonly admin: EmpresasAdminService,
    private readonly self: EmpresasSelfService,
    @Inject(I_EMPRESAS_REPOSITORY)
    private readonly repo: IEmpresasRepository,
  ) {}

  async crear(dto: CreateEmpresaDto, actorUserId: number) {
    return this.admin.crear(dto, actorUserId);
  }

  async listar(page: number, limit: number) {
    return this.admin.listar(page, limit);
  }

  async setActivo(adminId: number, empresaId: string, isActive: boolean) {
    return this.admin.setActivo(adminId, empresaId, isActive);
  }

  async asignarUsuario(adminId: number, empresaId: string, userId: number) {
    return this.admin.asignarUsuario(adminId, empresaId, userId);
  }

  async actualizar(empresaId: string, dto: UpdateEmpresaDto) {
    return this.self.actualizar(empresaId, dto);
  }

  async buscarPorId(id: string): Promise<ResponseEmpresaDto> {
    const empresa = await this.repo.findById(id);
    if (!empresa) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'EMPRESAS_NOT_FOUND',
        'Empresa no encontrada',
      );
    }
    return mapToResponseEmpresaDto(empresa);
  }

  async buscarPorUsuario(userId: number): Promise<ResponseEmpresaDto> {
    const empresa = await this.repo.findByUser(userId);
    if (!empresa) {
      throw httpError(
        HttpStatus.NOT_FOUND,
        'EMPRESAS_NOT_FOUND',
        'Empresa no encontrada para el usuario',
      );
    }
    return mapToResponseEmpresaDto(empresa);
  }
}
