import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

export interface EncryptedData {
  encryptedBuffer: Buffer;
  iv: Buffer;
  keyVersion: number;
}

@Injectable()
export class CsdsCryptoService {
  private readonly logger = new Logger(CsdsCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keys = new Map<number, Buffer>();
  private readonly activeKeyVersion: number;

  constructor(private readonly configService: ConfigService) {
    // Cargar todas las versiones de llaves disponibles (v1, v2, v3...)
    for (let i = 1; i <= 10; i++) {
      const hexKey = this.configService.get<string>(`CSD_ENCRYPTION_KEY_v${i}`);
      if (hexKey) {
        if (hexKey.length !== 64) {
          throw new Error(
            `CSD_ENCRYPTION_KEY_v${i} must be a 64-character hex string`,
          );
        }
        this.keys.set(i, Buffer.from(hexKey, 'hex'));
      }
    }

    if (this.keys.size === 0) {
      throw new Error('At least CSD_ENCRYPTION_KEY_v1 must be provided');
    }

    // La versión activa es la más alta
    this.activeKeyVersion = Math.max(...this.keys.keys());
    this.logger.log(
      `Criptografía CSD inicializada. Versión activa: v${this.activeKeyVersion}`,
    );
  }

  encrypt(buffer: Buffer): EncryptedData {
    const iv = crypto.randomBytes(12);
    const key = this.keys.get(this.activeKeyVersion);

    if (!key) {
      throw new InternalServerErrorException(
        'Error interno: llave activa no encontrada',
      );
    }

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBuffer: Buffer.concat([encrypted, authTag]),
      iv,
      keyVersion: this.activeKeyVersion,
    };
  }

  decrypt(
    encryptedBufferWithAuthTag: Buffer,
    iv: Buffer,
    keyVersion: number,
  ): Buffer {
    const key = this.keys.get(keyVersion);
    if (!key) {
      this.logger.error(
        `Intento de descifrado con versión de llave inexistente: v${keyVersion}`,
      );
      throw new InternalServerErrorException(
        `No se puede descifrar el CSD: la versión de la llave v${keyVersion} no está configurada en el servidor.`,
      );
    }

    const authTagLength = 16;
    const encLen = encryptedBufferWithAuthTag.length - authTagLength;
    const encrypted = encryptedBufferWithAuthTag.subarray(0, encLen);
    const authTag = encryptedBufferWithAuthTag.subarray(encLen);

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    try {
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      throw new InternalServerErrorException(
        'Error al descifrar el certificado. La llave de cifrado o el IV son incorrectos.',
      );
    }
  }

  zeroOutBuffer(buffer: Buffer): void {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }
}
