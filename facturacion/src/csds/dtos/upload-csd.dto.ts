import { IsString, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadCsdDto {
  @ApiProperty({
    description: 'Contraseña de la llave privada (.key)',
    format: 'password',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: 'La contraseña es obligatoria' })
  password!: string;
}
