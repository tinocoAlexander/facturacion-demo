import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { AuditService } from '../../audit/audit.service';
import { createMock } from '@golevelup/ts-jest';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;
  let auditService: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
    auditService = module.get(AuditService);
  });

  it('1. permite acceso si no hay roles requeridos (@Roles no aplicado)', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    const context = createMock<ExecutionContext>();

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('2. permite acceso si el usuario tiene el rol requerido', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { id: 1, role: 'admin' },
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
  });

  it('3. lanza ForbiddenException si el usuario no tiene el rol requerido', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { id: 1, role: 'user' },
      url: '/test',
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('4. lanza ForbiddenException si user es undefined (no autenticado)', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: undefined,
      url: '/test',
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('5. llama AuditService.log con AUTHZ_FORBIDDEN cuando deniega', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    const request = {
      user: { id: 123, role: 'cajero' },
      url: '/admin-only',
      id: 'req-id-1',
      headers: {},
    };
    context.switchToHttp().getRequest.mockReturnValue(request);

    try {
      await guard.canActivate(context);
    } catch {
      // Ignorar exception
    }

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(auditService.log).toHaveBeenCalledWith(
      'AUTHZ_FORBIDDEN',
      expect.objectContaining({
        actorUserId: 123,
        metadata: expect.objectContaining({
          path: '/admin-only',
          userRole: 'cajero',
          requiredRoles: ['admin'],
        }) as unknown,
      }),
    );
  });

  it('6. permite acceso con rol admin cuando se requiere admin', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { role: 'admin' },
    });

    expect(await guard.canActivate(context)).toBe(true);
  });

  it('7. deniega acceso con rol cajero cuando se requiere admin', async () => {
    jest.spyOn(reflector, 'get').mockReturnValue(['admin']);
    const context = createMock<ExecutionContext>();
    context.switchToHttp().getRequest.mockReturnValue({
      user: { role: 'cajero' },
      url: '/admin',
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
