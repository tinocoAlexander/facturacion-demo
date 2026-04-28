import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { TicketsIngestService } from './tickets-ingest.service';
import { I_TICKETS_REPOSITORY } from '../interfaces/tickets-repository.interface';
import { CatalogosService } from '../../catalogos/catalogos.service';
import { AuditService } from '../../audit/audit.service';
import { IngestTicketDto } from '../dtos';
import { ITicketsRepository } from '../interfaces/tickets-repository.interface';
import { TicketWithItems } from '../tickets.types';

describe('TicketsIngestService', () => {
  let service: TicketsIngestService;
  let repo: ITicketsRepository;
  let catalogos: CatalogosService;
  let audit: AuditService;

  const createValidDto = (): IngestTicketDto =>
    ({
      folio_externo: 'FOL-001',
      fecha_venta: '2024-04-28T10:00:00Z',
      forma_pago: '01',
      items: [
        {
          descripcion: 'Producto Test',
          cantidad: 1,
          precio_unitario: 100,
          tasa_iva: 0.16,
          clave_prod_serv: '01010101',
          clave_unidad: 'H87',
        },
      ],
    }) as IngestTicketDto;

  beforeEach(async () => {
    repo = {
      insertTicketWithItems: jest.fn(),
      findByFolioExternoAndEmpresa: jest.fn(),
      findByIdAndEmpresa: jest.fn(),
    } as unknown as ITicketsRepository;

    catalogos = {
      validateFormaPago: jest.fn(),
      validateClaveProdServ: jest.fn(),
      validateClaveUnidad: jest.fn(),
    } as unknown as CatalogosService;

    audit = {
      log: jest.fn(),
    } as unknown as AuditService;

    (repo.insertTicketWithItems as jest.Mock).mockImplementation(
      (t: Record<string, unknown>, items: unknown[]) =>
        Promise.resolve({
          id: 'new-id',
          ...t,
          items,
          notas: null,
          metadata: null,
          created_at: new Date(),
          updated_at: new Date(),
        } as unknown as TicketWithItems),
    );

    (catalogos.validateFormaPago as jest.Mock).mockResolvedValue(true);
    (catalogos.validateClaveProdServ as jest.Mock).mockResolvedValue(true);
    (catalogos.validateClaveUnidad as jest.Mock).mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsIngestService,
        { provide: I_TICKETS_REPOSITORY, useValue: repo },
        { provide: CatalogosService, useValue: catalogos },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<TicketsIngestService>(TicketsIngestService);
  });

  it('1. retorna ticket existente si folio_externo ya existe (idempotencia)', async () => {
    const existingTicket = {
      id: 'existing-uuid',
      folio_externo: 'FOL-001',
      estado: 'pendiente' as const,
    };
    (repo.findByFolioExternoAndEmpresa as jest.Mock).mockResolvedValue(
      existingTicket,
    );
    (repo.findByIdAndEmpresa as jest.Mock).mockResolvedValue({
      ...existingTicket,
      empresa_id: 'emp-1',
      fecha_venta: new Date(),
      subtotal: 100,
      total_iva: 16,
      total: 116,
      forma_pago: '01',
      moneda: 'MXN',
      tipo_cambio: 1,
      items: [],
      notas: null,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.ingestTicket('emp-1', 1, createValidDto());

    expect(result.id).toBe('existing-uuid');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.insertTicketWithItems).not.toHaveBeenCalled();
  });

  it('2. lanza 422 si forma_pago no existe en catálogo', async () => {
    (catalogos.validateFormaPago as jest.Mock).mockResolvedValue(false);

    await expect(
      service.ingestTicket('emp-1', 1, createValidDto()),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('3. lanza 422 si clave_prod_serv del item no existe', async () => {
    (catalogos.validateClaveProdServ as jest.Mock).mockResolvedValue(false);

    await expect(
      service.ingestTicket('emp-1', 1, createValidDto()),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('4. lanza 422 si clave_unidad del item no existe', async () => {
    (catalogos.validateClaveUnidad as jest.Mock).mockResolvedValue(false);

    await expect(
      service.ingestTicket('emp-1', 1, createValidDto()),
    ).rejects.toMatchObject({ status: HttpStatus.UNPROCESSABLE_ENTITY });
  });

  it('5. llama insertTicketWithItems con montos recalculados server-side, no los del cliente', async () => {
    const dto = createValidDto();
    dto.total = 999; // Cliente envía total erróneo

    await service.ingestTicket('emp-1', 1, dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repo.insertTicketWithItems).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: 100,
        total_iva: 16,
        total: 116, // 100 * 1.16
      }),
      expect.any(Array),
    );
  });

  it('6. asigna posicion auto-incremental si no viene en el item', async () => {
    const dto = createValidDto();
    dto.items.push({ ...dto.items[0], descripcion: 'Item 2' });

    await service.ingestTicket('emp-1', 1, dto);

    const calls = (repo.insertTicketWithItems as jest.Mock).mock.calls;
    const firstCall = calls[0] as unknown[];
    const itemsCalled = firstCall[1] as Record<string, unknown>[];
    expect(itemsCalled[0]['posicion']).toBe(1);
    expect(itemsCalled[1]['posicion']).toBe(2);
  });

  it('7. llama AuditService.log con TICKET_INGESTED tras insertar exitosamente', async () => {
    await service.ingestTicket('emp-1', 1, createValidDto());
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(audit.log).toHaveBeenCalledWith(
      'TICKET_INGESTED',
      expect.any(Object),
    );
  });

  it('8. maneja race condition 23505: si insertTicketWithItems lanza error con code 23505, intenta recuperar el ticket existente', async () => {
    const dto = createValidDto();
    (repo.insertTicketWithItems as jest.Mock).mockRejectedValue({
      code: '23505',
    });

    // Mock para la recuperación
    const existing = {
      id: 'recovered-id',
      folio_externo: dto.folio_externo,
      estado: 'pendiente' as const,
    };
    (repo.findByFolioExternoAndEmpresa as jest.Mock)
      .mockResolvedValueOnce(null) // Primera llamada en ingestTicket
      .mockResolvedValueOnce(existing); // Llamada en el catch
    (repo.findByIdAndEmpresa as jest.Mock).mockResolvedValue({
      ...existing,
      empresa_id: 'emp-1',
      fecha_venta: new Date(),
      subtotal: 100,
      total_iva: 16,
      total: 116,
      forma_pago: '01',
      moneda: 'MXN',
      tipo_cambio: 1,
      items: [],
      notas: null,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const result = await service.ingestTicket('emp-1', 1, dto);
    expect(result.id).toBe('recovered-id');
  });

  it('9. re-lanza errores que no son 23505', async () => {
    (repo.insertTicketWithItems as jest.Mock).mockRejectedValue(
      new Error('DB error'),
    );
    await expect(
      service.ingestTicket('emp-1', 1, createValidDto()),
    ).rejects.toThrow('DB error');
  });

  it('10. asigna objeto_imp "02" por defecto si no viene en el item', async () => {
    const dto = createValidDto();
    delete dto.items[0].objeto_imp;

    await service.ingestTicket('emp-1', 1, dto);

    const calls = (repo.insertTicketWithItems as jest.Mock).mock.calls;
    const firstCall = calls[0] as unknown[];
    const itemsCalled = firstCall[1] as Record<string, unknown>[];
    expect(itemsCalled[0]['objeto_imp']).toBe('02');
  });
});
