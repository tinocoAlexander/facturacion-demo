import { Injectable, Logger, HttpStatus, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { CsdsCryptoService } from './csds-crypto.service';
import {
  I_CSD_REPOSITORY,
  CreateCsdData,
} from '../interfaces/csds-repository.interface';
import type { ICsdRepository } from '../interfaces/csds-repository.interface';
import { MulterFile } from '../csds.types';
import { httpError } from '../../common/errors/http-error';

@Injectable()
export class CsdsUploadService {
  private readonly logger = new Logger(CsdsUploadService.name);

  constructor(
    private readonly cryptoService: CsdsCryptoService,
    @Inject(I_CSD_REPOSITORY) private readonly repo: ICsdRepository,
  ) {}

  async processAndSave(
    empresaId: string,
    cerFile: MulterFile,
    keyFile: MulterFile,
    passwordPlain: string,
  ) {
    try {
      // 1. Validate DER format for .cer
      if (cerFile.buffer[0] !== 0x30) {
        throw httpError(
          HttpStatus.BAD_REQUEST,
          'CSD_INVALID_FORMAT',
          'El archivo .cer no es un certificado DER válido',
        );
      }

      // 2. Extract info from .cer
      let cert: crypto.X509Certificate;
      try {
        cert = new crypto.X509Certificate(cerFile.buffer);
      } catch (err) {
        this.logger.error('Error parsing certificate', (err as Error).message);
        throw httpError(
          HttpStatus.BAD_REQUEST,
          'CSD_PARSE_ERROR',
          'No se pudo extraer la información del certificado',
        );
      }

      // El serialNumber devuelto por X509Certificate en Node.js es hexadecimal.
      // El SAT usualmente lo lee de los dígitos decimales que forman los caracteres ascii,
      // pero para fines de este módulo y como dice el warning de Node.js,
      // extraeremos el serialNumber directamente provisto por el módulo crypto.
      // A veces los certificados del SAT requieren convertir de hex a ascii
      // (por ej: 333030... -> "300..."). Haremos una conversión heurística.
      let noCertificado = cert.serialNumber;
      if (/^([0-9a-fA-F]{2})+$/.test(noCertificado)) {
        const asciiStr = Buffer.from(noCertificado, 'hex').toString('ascii');
        // Si al convertir a ascii todos son números, es muy probable que sea el noCertificado real del SAT
        if (/^\d{20}$/.test(asciiStr)) {
          noCertificado = asciiStr;
        }
      }

      // 3. Check duplicate
      const exists = await this.repo.checkNoCertificadoExists(noCertificado);
      if (exists) {
        throw httpError(
          HttpStatus.CONFLICT,
          'CSD_CERT_DUPLICADO',
          'El certificado ya existe',
        );
      }

      // 4. Encrypt data
      const encryptedCer = this.cryptoService.encrypt(cerFile.buffer);
      const encryptedKey = this.cryptoService.encrypt(keyFile.buffer);

      const passwordBuffer = Buffer.from(passwordPlain, 'utf-8');
      const encryptedPassword = this.cryptoService.encrypt(passwordBuffer);

      // 5. Build DTO for repo
      const data: CreateCsdData = {
        empresa_id: empresaId,
        no_certificado: noCertificado,
        cer_cifrado: encryptedCer.encryptedBuffer,
        iv_cer: encryptedCer.iv,
        key_cifrado: encryptedKey.encryptedBuffer,
        iv_key: encryptedKey.iv,
        password_cifrado: encryptedPassword.encryptedBuffer,
        iv_password: encryptedPassword.iv,
        key_version: encryptedCer.keyVersion,
        fecha_inicio_vigencia: new Date(cert.validFrom),
        fecha_fin_vigencia: new Date(cert.validTo),
      };

      // 6. Save
      const created = await this.repo.create(data);

      // 7. Zero out plain buffers in memory
      this.cryptoService.zeroOutBuffer(cerFile.buffer);
      this.cryptoService.zeroOutBuffer(keyFile.buffer);
      this.cryptoService.zeroOutBuffer(passwordBuffer);
      // Ocultar password en memoria (la cadena es inmutable pero al menos sobreescribimos la referencia)
      passwordPlain = '';

      return created;
    } catch (err) {
      // Intentar limpiar buffers en caso de error
      if (cerFile?.buffer) this.cryptoService.zeroOutBuffer(cerFile.buffer);
      if (keyFile?.buffer) this.cryptoService.zeroOutBuffer(keyFile.buffer);
      throw err;
    }
  }
}
