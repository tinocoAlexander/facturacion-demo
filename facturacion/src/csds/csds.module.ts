import { Module } from '@nestjs/common';
import { CsdsController } from './csds.controller';
import { CsdsService } from './csds.service';
import { CsdsUploadService } from './services/csds-upload.service';
import { CsdsCryptoService } from './services/csds-crypto.service';
import { CsdsRepository } from './csds.repository';
import { I_CSD_REPOSITORY } from './interfaces/csds-repository.interface';
import { AuthModule } from '../auth/auth.module';
import { EmpresasModule } from '../empresas/empresas.module';

@Module({
  imports: [AuthModule, EmpresasModule],
  controllers: [CsdsController],
  providers: [
    CsdsService,
    CsdsUploadService,
    CsdsCryptoService,
    {
      provide: I_CSD_REPOSITORY,
      useClass: CsdsRepository,
    },
  ],
  exports: [CsdsService, I_CSD_REPOSITORY],
})
export class CsdsModule {}
