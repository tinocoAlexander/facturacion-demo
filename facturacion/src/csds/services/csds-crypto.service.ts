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
}

@Injectable()
export class CsdsCryptoService {
  private readonly logger = new Logger(CsdsCryptoService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private readonly configService: ConfigService) {
    const hexKey = this.configService.get<string>('CSD_ENCRYPTION_KEY');
    if (!hexKey || hexKey.length !== 64) {
      throw new Error('CSD_ENCRYPTION_KEY must be a 64-character hex string');
    }
    this.key = Buffer.from(hexKey, 'hex');
  }

  encrypt(buffer: Buffer): EncryptedData {
    const iv = crypto.randomBytes(12); // 96 bits — recomendado por NIST para GCM
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);

    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // In GCM mode, we need to store the auth tag. We will append it to the encrypted buffer.
    // AES-GCM auth tag is always 16 bytes.
    const finalEncryptedBuffer = Buffer.concat([encrypted, authTag]);

    return {
      encryptedBuffer: finalEncryptedBuffer,
      iv,
    };
  }

  decrypt(encryptedBufferWithAuthTag: Buffer, iv: Buffer): Buffer {
    return this.decryptWithIv(encryptedBufferWithAuthTag, iv);
  }

  private decryptWithIv(encryptedWithTag: Buffer, iv: Buffer): Buffer {
    // Soporte para IVs legacy de 16 bytes y nuevos de 12 bytes
    // El tamaño del IV está implícito en el campo iv almacenado en la DB
    const authTagLength = 16;
    const encLen = encryptedWithTag.length - authTagLength;
    const encrypted = encryptedWithTag.subarray(0, encLen);
    const authTag = encryptedWithTag.subarray(encLen);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    try {
      return Buffer.concat([decipher.update(encrypted), decipher.final()]);
    } catch {
      // NUNCA loguear el error real — puede contener info del plaintext
      throw new InternalServerErrorException(
        'Error al descifrar el certificado. Verifica que CSD_ENCRYPTION_KEY sea correcta.',
      );
    }
  }

  zeroOutBuffer(buffer: Buffer): void {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }
}
