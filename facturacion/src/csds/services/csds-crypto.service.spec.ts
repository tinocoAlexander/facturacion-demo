import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CsdsCryptoService } from './csds-crypto.service';
import * as crypto from 'crypto';
import { InternalServerErrorException } from '@nestjs/common';

describe('CsdsCryptoService', () => {
  let service: CsdsCryptoService;
  let validKeyV1: string;

  beforeEach(async () => {
    validKeyV1 = crypto.randomBytes(32).toString('hex');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CsdsCryptoService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'CSD_ENCRYPTION_KEY_v1') return validKeyV1;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<CsdsCryptoService>(CsdsCryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('1. encrypt retorna encryptedBuffer, iv e keyVersion de longitudes correctas', () => {
    const plaintext = Buffer.from('test message', 'utf-8');
    const result = service.encrypt(plaintext);

    expect(result.iv).toHaveLength(12);
    expect(result.keyVersion).toBeGreaterThanOrEqual(1);
    // GCM: encrypted + 16 bytes tag
    expect(result.encryptedBuffer.length).toBeGreaterThan(plaintext.length);
    expect(result.encryptedBuffer.length).toBe(plaintext.length + 16);
  });

  it('2. encrypt/decrypt round-trip es correcto', () => {
    const plaintext = Buffer.from('Secret message for SAT', 'utf-8');
    const encrypted = service.encrypt(plaintext);
    const decrypted = service.decrypt(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.keyVersion,
    );

    expect(decrypted.toString('utf-8')).toBe(plaintext.toString('utf-8'));
    expect(decrypted.equals(plaintext)).toBe(true);
  });

  it('3. encrypt genera IV distinto en cada llamada', () => {
    const plaintext = Buffer.from('same content', 'utf-8');
    const result1 = service.encrypt(plaintext);
    const result2 = service.encrypt(plaintext);

    expect(result1.iv.equals(result2.iv)).toBe(false);
    expect(result1.encryptedBuffer.equals(result2.encryptedBuffer)).toBe(false);
  });

  it('4. decrypt lanza InternalServerErrorException si el auth tag es inválido (tampering detection)', () => {
    const encrypted = service.encrypt(Buffer.from('sensitive data'));

    // Modificar el último byte del buffer cifrado (que es parte del Auth Tag en GCM)
    const tamperedBuffer = Buffer.from(encrypted.encryptedBuffer);
    tamperedBuffer[tamperedBuffer.length - 1] ^= 0xff;

    expect(() =>
      service.decrypt(tamperedBuffer, encrypted.iv, encrypted.keyVersion),
    ).toThrow(InternalServerErrorException);
  });

  it('5. decrypt lanza InternalServerErrorException si el IV es incorrecto', () => {
    const encrypted = service.encrypt(Buffer.from('sensitive data'));
    const wrongIv = crypto.randomBytes(12);

    expect(() =>
      service.decrypt(encrypted.encryptedBuffer, wrongIv, encrypted.keyVersion),
    ).toThrow(InternalServerErrorException);
  });

  it('6. decrypt lanza InternalServerErrorException si se trunca el buffer', () => {
    const smallBuffer = Buffer.alloc(5, 0);
    const someIv = crypto.randomBytes(12);

    expect(() => service.decrypt(smallBuffer, someIv, 1)).toThrow(
      InternalServerErrorException,
    );
  });

  it('7. zeroOutBuffer sobreescribe el buffer con ceros', () => {
    const buffer = Buffer.from('top secret data');
    const originalContent = Buffer.from(buffer);

    service.zeroOutBuffer(buffer);

    expect(buffer.equals(originalContent)).toBe(false);
    for (const byte of buffer) {
      expect(byte).toBe(0);
    }
  });

  it('8. zeroOutBuffer no lanza si el buffer ya está vacío', () => {
    const emptyBuffer = Buffer.alloc(0);
    expect(() => service.zeroOutBuffer(emptyBuffer)).not.toThrow();
  });

  it('9. constructor lanza si CSD_ENCRYPTION_KEY_v1 no tiene 64 chars o no existe', () => {
    const badConfig: Record<string, jest.Mock> = {
      get: jest.fn((key: string) => {
        if (key === 'CSD_ENCRYPTION_KEY_v1') return 'short_key';
        return null;
      }),
    };

    expect(
      () => new CsdsCryptoService(badConfig as unknown as ConfigService),
    ).toThrow();
  });

  it('10. encrypt de buffer grande (1MB) funciona correctamente', () => {
    const largeBuffer = crypto.randomBytes(1024 * 1024);
    const encrypted = service.encrypt(largeBuffer);
    const decrypted = service.decrypt(
      encrypted.encryptedBuffer,
      encrypted.iv,
      encrypted.keyVersion,
    );

    expect(decrypted.equals(largeBuffer)).toBe(true);
    expect(decrypted.length).toBe(1024 * 1024);
  });

  it('Extra: soporta múltiples versiones de llaves y descifra correctamente con la versión específica', () => {
    const keyV2 = crypto.randomBytes(32).toString('hex');

    const multiKeyConfig: Record<string, jest.Mock> = {
      get: jest.fn((key: string) => {
        if (key === 'CSD_ENCRYPTION_KEY_v1') return validKeyV1;
        if (key === 'CSD_ENCRYPTION_KEY_v2') return keyV2;
        return null;
      }),
    };

    const multiService = new CsdsCryptoService(
      multiKeyConfig as unknown as ConfigService,
    );

    const plaintext = Buffer.from('multi-key test');
    const encrypted = multiService.encrypt(plaintext);

    // Verificamos que usó la v2 (la más alta)
    expect(encrypted.keyVersion).toBe(2);

    // Verificamos que puede descifrar algo cifrado con v1
    const v1Service = service; // Ya tiene v1
    const v1Encrypted = v1Service.encrypt(plaintext);

    const decryptedWithMulti = multiService.decrypt(
      v1Encrypted.encryptedBuffer,
      v1Encrypted.iv,
      1,
    );

    expect(decryptedWithMulti.equals(plaintext)).toBe(true);
  });
});
