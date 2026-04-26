import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketsIngestService } from './services/tickets-ingest.service';
import { TicketsQueryService } from './services/tickets-query.service';
import { TicketsStateService } from './services/tickets-state.service';
import { TicketsRepository } from './tickets.repository';
import { I_TICKETS_REPOSITORY } from './interfaces/tickets-repository.interface';

import { EmpresasModule } from '../empresas/empresas.module';

@Module({
  imports: [EmpresasModule],
  controllers: [TicketsController],
  providers: [
    TicketsService,
    TicketsIngestService,
    TicketsQueryService,
    TicketsStateService,
    {
      provide: I_TICKETS_REPOSITORY,
      useClass: TicketsRepository,
    },
  ],
  exports: [TicketsStateService, I_TICKETS_REPOSITORY],
})
export class TicketsModule {}
