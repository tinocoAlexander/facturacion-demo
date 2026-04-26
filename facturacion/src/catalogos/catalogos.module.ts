import { Module, Global } from '@nestjs/common';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';
import { CatalogosSyncService } from './services/catalogos-sync.service';
import { CatalogosRepository } from './catalogos.repository';
import { I_CATALOGOS_REPOSITORY } from './interfaces/catalogos-repository.interface';
import { RedisModule } from '../redis/redis.module';
import { AuthModule } from '../auth/auth.module';

@Global()
@Module({
  imports: [RedisModule, AuthModule],
  controllers: [CatalogosController],
  providers: [
    CatalogosService,
    CatalogosSyncService,
    {
      provide: I_CATALOGOS_REPOSITORY,
      useClass: CatalogosRepository,
    },
  ],
  exports: [CatalogosService, I_CATALOGOS_REPOSITORY],
})
export class CatalogosModule {}
