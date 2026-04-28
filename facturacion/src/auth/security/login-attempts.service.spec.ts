import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoginAttemptsService } from './login-attempts.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('LoginAttemptsService', () => {
  let service: LoginAttemptsService;
  let redisMock: Record<string, jest.Mock>;

  const mockConfig = {
    get: jest.fn((key: string) => {
      switch (key) {
        case 'LOGIN_MAX_ATTEMPTS_EMAIL':
          return 3;
        case 'LOGIN_MAX_ATTEMPTS_IP':
          return 5;
        case 'LOGIN_ATTEMPT_WINDOW_MS':
          return 60000;
        case 'LOGIN_ATTEMPT_BLOCK_MS':
          return 30000;
        default:
          return null;
      }
    }),
  };

  describe('Modo In-Memory (redis = null)', () => {
    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoginAttemptsService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: 'REDIS_CLIENT', useValue: null }, // Mock de @InjectRedis()
        ],
      }).compile();

      service = module.get<LoginAttemptsService>(LoginAttemptsService);
    });

    it('1. assertNotBlocked no lanza si no hay intentos previos', async () => {
      await expect(
        service.assertNotBlocked('test@example.com', '127.0.0.1'),
      ).resolves.not.toThrow();
    });

    it('2. registerFailure + assertNotBlocked: después de 3 fallos lanza HttpException 429', async () => {
      const email = 'fail@example.com';
      await service.registerFailure(email);
      await service.registerFailure(email);
      await expect(service.assertNotBlocked(email)).resolves.not.toThrow();

      await service.registerFailure(email); // 3er fallo
      await expect(service.assertNotBlocked(email)).rejects.toThrow(
        HttpException,
      );
      await expect(service.assertNotBlocked(email)).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
      });
    });

    it('3. el bloqueo es por email: IP diferente no está bloqueada tras 3 fallos del email', async () => {
      const email = 'fail@example.com';
      const ip = '1.1.1.1';
      await service.registerFailure(email, ip);
      await service.registerFailure(email, ip);
      await service.registerFailure(email, ip);

      await expect(service.assertNotBlocked(email)).rejects.toThrow();
      await expect(
        service.assertNotBlocked('other@example.com', '2.2.2.2'),
      ).resolves.not.toThrow();
    });

    it('4. el bloqueo es por IP: email diferente no está bloqueado tras 5 fallos de la IP', async () => {
      const ip = '10.0.0.1';
      for (let i = 0; i < 5; i++) {
        await service.registerFailure('user' + i + '@example.com', ip);
      }

      await expect(
        service.assertNotBlocked('anyone@example.com', ip),
      ).rejects.toThrow();
      await expect(
        service.assertNotBlocked('anyone@example.com', '10.0.0.2'),
      ).resolves.not.toThrow();
    });

    it('5. registerSuccess después de fallos limpia el contador del email', async () => {
      const email = 'test@example.com';
      await service.registerFailure(email);
      await service.registerFailure(email);
      await service.registerSuccess(email);
      await service.registerFailure(email);
      await service.registerFailure(email);

      // Si no se hubiera limpiado, este sería el 4to fallo y estaría bloqueado
      await expect(service.assertNotBlocked(email)).resolves.not.toThrow();
    });

    it('6. registerSuccess después de fallos limpia el contador de la IP', async () => {
      const ip = '192.168.1.1';
      await service.registerFailure('a@a.com', ip);
      await service.registerFailure('b@b.com', ip);
      await service.registerSuccess('dummy@email.com', ip);

      for (let i = 0; i < 4; i++) {
        await service.registerFailure('u' + i + '@u.com', ip);
      }
      await expect(
        service.assertNotBlocked('final@u.com', ip),
      ).resolves.not.toThrow();
    });

    it('7. la ventana de tiempo se resetea: intentos fuera de windowMs no bloquean', async () => {
      const email = 'window@example.com';
      const now = 1000000;
      const spy = jest.spyOn(Date, 'now').mockReturnValue(now);

      await service.registerFailure(email);
      await service.registerFailure(email);

      // Avanzar tiempo más allá de 60s (windowMs)
      spy.mockReturnValue(now + 61000);

      await service.registerFailure(email);
      // Debería ser como el primer intento de una nueva ventana
      await expect(service.assertNotBlocked(email)).resolves.not.toThrow();

      spy.mockRestore();
    });

    it('8. assertNotBlocked no lanza si blockedUntilMs ya pasó', async () => {
      const email = 'block@example.com';
      const now = 1000000;
      const spy = jest.spyOn(Date, 'now').mockReturnValue(now);

      await service.registerFailure(email);
      await service.registerFailure(email);
      await service.registerFailure(email); // Bloqueado por 30s

      await expect(service.assertNotBlocked(email)).rejects.toThrow();

      spy.mockReturnValue(now + 31000);
      await expect(service.assertNotBlocked(email)).resolves.not.toThrow();

      spy.mockRestore();
    });
  });

  describe('Modo Redis', () => {
    beforeEach(async () => {
      redisMock = {
        mget: jest.fn().mockResolvedValue([null, null]),
        del: jest.fn().mockResolvedValue(1),
        incr: jest.fn(),
        pttl: jest.fn(),
        exists: jest.fn().mockResolvedValue(0),
        set: jest.fn().mockResolvedValue('OK'),
        pexpire: jest.fn().mockResolvedValue(1),
        multi: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([
          [null, 1],
          [null, 100],
        ]),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LoginAttemptsService,
          { provide: ConfigService, useValue: mockConfig },
          { provide: 'REDIS_CLIENT', useValue: redisMock as unknown },
        ],
      }).compile();

      service = module.get<LoginAttemptsService>(LoginAttemptsService);
    });

    it('9. assertNotBlocked llama mget con las keys correctas de email e IP', async () => {
      await service.assertNotBlocked('User@Example.com', '1.2.3.4');
      expect(redisMock.mget).toHaveBeenCalledWith([
        'login:block:email:user@example.com',
        'login:block:ip:1.2.3.4',
      ]);
    });

    it('10. assertNotBlocked lanza 429 si mget retorna al menos un valor no-null', async () => {
      redisMock.mget.mockResolvedValue(['1', null]);
      await expect(service.assertNotBlocked('test@test.com')).rejects.toThrow(
        HttpException,
      );
    });

    it('11. registerFailure llama incr y pexpire con la key correcta de email', async () => {
      // Mock para simular primer incremento sin TTL
      redisMock.exec.mockResolvedValueOnce([
        [null, 1],
        [null, -1],
      ]);

      await service.registerFailure('fail@test.com');

      expect(redisMock.incr).toHaveBeenCalledWith(
        'login:attempts:email:fail@test.com',
      );
      expect(redisMock.pexpire).toHaveBeenCalledWith(
        'login:attempts:email:fail@test.com',
        60000,
      );
    });

    it('12. registerSuccess llama del con las keys de email e IP', async () => {
      await service.registerSuccess('clear@test.com', '8.8.8.8');
      expect(redisMock.del).toHaveBeenCalledWith([
        'login:attempts:email:clear@test.com',
        'login:attempts:ip:8.8.8.8',
      ]);
    });

    it('13. bumpRedis no actúa si blockKey ya existe (exists retorna 1)', async () => {
      redisMock.exists.mockResolvedValue(1);
      await service.registerFailure('already-blocked@test.com');
      expect(redisMock.incr).not.toHaveBeenCalled();
    });
  });
});
