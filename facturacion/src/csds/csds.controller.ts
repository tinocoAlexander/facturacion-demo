import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFiles,
  Body,
  ParseUUIDPipe,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { TenantGuard } from '../auth/guards/tenant.guard';
import type { RequestWithTenant } from '../auth/guards/tenant.guard';
import { CsdsService } from './csds.service';
import { UploadCsdDto } from './dtos';
import { httpError } from '../common/errors/http-error';
import { MulterFile } from './csds.types';

@ApiTags('csds')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('csds')
export class CsdsController {
  constructor(private readonly csdsService: CsdsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Subir nuevo CSD (cert, key y password)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        cer_file: { type: 'string', format: 'binary' },
        key_file: { type: 'string', format: 'binary' },
        password: { type: 'string' },
      },
      required: ['cer_file', 'key_file', 'password'],
    },
  })
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cer_file', maxCount: 1 },
        { name: 'key_file', maxCount: 1 },
      ],
      {
        limits: { fileSize: 10 * 1024 }, // 10kb limit
      },
    ),
  )
  async upload(
    @Request() req: RequestWithTenant,
    @Body() dto: UploadCsdDto,
    @UploadedFiles()
    files: {
      cer_file?: MulterFile[];
      key_file?: MulterFile[];
    },
  ) {
    if (!files.cer_file || !files.cer_file[0]) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'CSD_MISSING_CER',
        'Falta el archivo .cer',
      );
    }
    if (!files.key_file || !files.key_file[0]) {
      throw httpError(
        HttpStatus.BAD_REQUEST,
        'CSD_MISSING_KEY',
        'Falta el archivo .key',
      );
    }

    return this.csdsService.uploadCsd(
      req.empresa.id,
      files.cer_file[0],
      files.key_file[0],
      dto.password,
      req.user!.id,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar CSDs de mi empresa' })
  async listar(
    @Request() req: RequestWithTenant,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.csdsService.listar(req.empresa.id, page, limit);
  }

  @Get('activo')
  @ApiOperation({ summary: 'Ver el CSD activo actual' })
  async getActivo(@Request() req: RequestWithTenant) {
    return this.csdsService.getActiveCsd(req.empresa.id);
  }

  @Patch(':id/activar')
  @ApiOperation({ summary: 'Activar un CSD específico' })
  async activar(
    @Request() req: RequestWithTenant,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.csdsService.activarCsd(req.empresa.id, id, req.user!.id);
    return { success: true };
  }
}
