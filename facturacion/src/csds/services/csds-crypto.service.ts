import { Injectable, Logger } from '@nestjs/common';
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
    const iv = crypto.randomBytes(16);
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
    // Extract auth tag (last 16 bytes)
    const authTagLength = 16;
    const encryptedLength = encryptedBufferWithAuthTag.length - authTagLength;

    const encrypted = encryptedBufferWithAuthTag.subarray(0, encryptedLength);
    const authTag = encryptedBufferWithAuthTag.subarray(encryptedLength);

    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted;
  }

  zeroOutBuffer(buffer: Buffer): void {
    if (Buffer.isBuffer(buffer)) {
      buffer.fill(0);
    }
  }
}
