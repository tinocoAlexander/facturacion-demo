import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CsdsCryptoService } from '../../csds/services/csds-crypto.service';
import { Pool } from 'pg';
import { CSD_QUERIES } from '../queries/csds.queries';
import { Logger } from '@nestjs/common';

interface CsdRow {
  id: string;
  no_certificado: string;
  key_version: number;
  cer_cifrado: Buffer;
  iv_cer: Buffer;
  key_cifrado: Buffer;
  iv_key: Buffer;
  password_cifrado: Buffer;
  iv_password: Buffer;
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const logger = new Logger('RotateCsdKey');
  const cryptoService = app.get(CsdsCryptoService);
  const pool = app.get<Pool>('DATABASE_POOL');

  logger.log('Iniciando rotación de llaves de cifrado para CSDs...');

  try {
    const { rows } = await pool.query<CsdRow>(
      CSD_QUERIES.FIND_ALL_FOR_ROTATION,
    );
    const csds = rows;
    logger.log(`Se encontraron ${csds.length} certificados para procesar.`);

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < csds.length; i += 10) {
      const batch = csds.slice(i, i + 10);
      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        for (const csd of batch) {
          try {
            logger.log(
              `Rotando CSD ${csd.no_certificado} (v${csd.key_version} -> activa)...`,
            );

            const cer = cryptoService.decrypt(
              csd.cer_cifrado,
              csd.iv_cer,
              csd.key_version,
            );
            const key = cryptoService.decrypt(
              csd.key_cifrado,
              csd.iv_key,
              csd.key_version,
            );
            const password = cryptoService.decrypt(
              csd.password_cifrado,
              csd.iv_password,
              csd.key_version,
            );

            const newCer = cryptoService.encrypt(cer);
            const newKey = cryptoService.encrypt(key);
            const newPass = cryptoService.encrypt(password);

            await client.query(CSD_QUERIES.UPDATE_ENCRYPTED_DATA, [
              newCer.encryptedBuffer,
              newKey.encryptedBuffer,
              newPass.encryptedBuffer,
              newCer.iv,
              newKey.iv,
              newPass.iv,
              newCer.keyVersion,
              csd.id,
            ]);

            successCount++;
          } catch (err) {
            logger.error(
              `Fallo al rotar CSD ${csd.no_certificado}: ${(err as Error).message}`,
            );
            failCount++;
          }
        }

        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        logger.error(
          `Error crítico en lote de rotación: ${(err as Error).message}`,
        );
      } finally {
        client.release();
      }
    }

    logger.log('--- Resumen de Rotación ---');
    logger.log(`Exitosos: ${successCount}`);
    logger.log(`Fallidos:  ${failCount}`);
    logger.log('---------------------------');
  } catch (err) {
    logger.error(`Error al leer CSDs: ${(err as Error).message}`);
  } finally {
    await app.close();
  }
}

void bootstrap();
