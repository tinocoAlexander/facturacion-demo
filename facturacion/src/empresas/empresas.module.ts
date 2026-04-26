import { Module } from '@nestjs/common';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { EmpresasRepository } from './empresas.repository';
import { I_EMPRESAS_REPOSITORY } from './interfaces/empresas-repository.interface';
import { EmpresasAdminService } from './services/empresas-admin.service';
import { EmpresasSelfService } from './services/empresas-self.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [EmpresasController],
  providers: [
    EmpresasService,
    {
      provide: I_EMPRESAS_REPOSITORY,
      useClass: EmpresasRepository,
    },
    EmpresasAdminService,
    EmpresasSelfService,
  ],
  exports: [EmpresasService, I_EMPRESAS_REPOSITORY],
})
export class EmpresasModule {}
