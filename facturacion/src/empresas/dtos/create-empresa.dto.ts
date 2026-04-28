import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateEmpresaDto {
  @ApiProperty({
    description: 'RFC de la empresa (Persona Física o Moral)',
    example: 'XAXX010101000',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, {
    message:
      'RFC inválido. Formato: 3-4 letras, 6 dígitos (fecha), 3 alfanuméricos. Ejemplo: XAXX010101000',
  })
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.toUpperCase().trim() : (value as string),
  )
  rfc!: string;

  @ApiProperty({ example: 'Mi Empresa S.A.' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  nombre_comercial!: string;

  @ApiProperty({ example: 'MI EMPRESA SA DE CV' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(255)
  @Transform(({ value }): string =>
    typeof value === 'string' ? value.trim() : (value as string),
  )
  razon_social!: string;

  @ApiProperty({
    description: 'Régimen Fiscal (Catálogo SAT CFDI 4.0)',
    example: '601',
  })
  @IsString()
  @IsIn(
    [
      '601',
      '603',
      '605',
      '606',
      '607',
      '608',
      '609',
      '610',
      '611',
      '612',
      '614',
      '616',
      '620',
      '621',
      '622',
      '623',
      '624',
      '625',
      '626',
      '628',
      '629',
      '630',
    ],
    {
      message:
        'Régimen fiscal inválido. Debe ser una clave del catálogo SAT CFDI 4.0',
    },
  )
  regimen_fiscal!: string;

  @ApiProperty({ example: '06600' })
  @IsString()
  @Matches(/^\d{5}$/, {
    message: 'Código postal debe tener exactamente 5 dígitos',
  })
  codigo_postal!: string;

  @ApiProperty({ required: false, example: 'contacto@empresa.com' })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email_contacto?: string;

  @ApiProperty({ required: false, example: '5512345678' })
  @IsString()
  @IsOptional()
  @Matches(/^[\d\s\-+()]{7,20}$/)
  @MaxLength(20)
  telefono?: string;

  @ApiProperty({ required: false, example: 'https://cdn.empresa.com/logo.png' })
  @IsUrl()
  @IsOptional()
  @MaxLength(2048)
  logo_url?: string;
}
