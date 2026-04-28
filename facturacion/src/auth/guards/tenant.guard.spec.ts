import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { TenantGuard } from './tenant.guard';
import { AuditService } from '../../audit/audit.service';
import { I_EMPRESAS_REPOSITORY } from '../../empresas/interfaces/empresas-repository.interface';
import { createMock } from '@golevelup/ts-jest';

describe('TenantGuard', () => {
  let guard: TenantGuard;
  let empresasRepo: { findById: jest.Mock };

  const mockEmpresa = {
    id: 'emp-1',
    is_active: true,
    nombre_comercial: 'Empresa Test',
  };

  beforeEach(async () => {
    empresasRepo = {
      findById: jest.fn().mockResolvedValue(mockEmpresa),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantGuard,
        {
          provide: I_EMPRESAS_REPOSITORY,
          useValue: empresasRepo,
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  it('1. lanza ForbiddenException con code TENANT_REQUIRED si user.empresa_id es null', async () => {
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { empresa_id: null },
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TENANT_REQUIRED' }) as unknown,
    });
  });

  it('2. lanza ForbiddenException con code TENANT_NOT_FOUND si la empresa no existe en DB', async () => {
    empresasRepo.findById.mockResolvedValue(null);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { empresa_id: 'non-existent' },
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'TENANT_NOT_FOUND',
      }) as unknown,
    });
  });

  it('3. lanza ForbiddenException con code TENANT_INACTIVE si empresa.is_active es false', async () => {
    empresasRepo.findById.mockResolvedValue({
      ...mockEmpresa,
      is_active: false,
    });
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { empresa_id: 'emp-1' },
    });

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'TENANT_INACTIVE' }) as unknown,
    });
  });

  it('4. agrega empresa al request si todo es válido', async () => {
    const context = createMock<ExecutionContext>();
    const request: Record<string, unknown> = {
      user: { empresa_id: 'emp-1' },
    };
    context.switchToHttp().getRequest.mockReturnValue(request);

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(request['empresa']).toEqual(mockEmpresa);
  });

  it('5. usa cache en llamadas subsecuentes — repositorio solo se llama una vez', async () => {
    // Para probar el cache necesitamos que NODE_ENV no sea 'test'
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { empresa_id: 'emp-1' },
    });

    // Llamar dos veces
    await guard.canActivate(context);
    await guard.canActivate(context);

    expect(empresasRepo.findById).toHaveBeenCalledTimes(1);

    process.env.NODE_ENV = originalEnv;
  });

  it('6. el cache no se usa en NODE_ENV=test', async () => {
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { empresa_id: 'emp-1' },
    });

    // En test (NODE_ENV=test por defecto en jest), el cache se ignora
    await guard.canActivate(context);
    await guard.canActivate(context);

    expect(empresasRepo.findById).toHaveBeenCalledTimes(2);
  });
});
