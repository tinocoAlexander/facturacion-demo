import { ApiProperty } from '@nestjs/swagger';

export class ResponseEmpresaDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'XAXX010101000' })
  rfc!: string;

  @ApiProperty({ example: 'Mi Empresa S.A.' })
  nombre_comercial!: string;

  @ApiProperty({ example: 'MI EMPRESA SA DE CV' })
  razon_social!: string;

  @ApiProperty({ example: '601' })
  regimen_fiscal!: string;

  @ApiProperty({ example: '06600' })
  codigo_postal!: string;

  @ApiProperty({ example: 'contacto@empresa.com', nullable: true })
  email_contacto!: string | null;

  @ApiProperty({ example: '5512345678', nullable: true })
  telefono!: string | null;

  @ApiProperty({
    example: 'https://cdn.empresa.com/logo.png',
    nullable: true,
  })
  logo_url!: string | null;

  @ApiProperty({ example: true })
  is_active!: boolean;

  @ApiProperty({ example: '2026-04-26T12:00:00Z' })
  created_at!: Date;

  @ApiProperty({ example: '2026-04-26T12:00:00Z' })
  updated_at!: Date;
}
