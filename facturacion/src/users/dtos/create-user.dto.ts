import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email único del usuario',
  })
  @IsEmail({}, { message: 'Email debe ser válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email!: string;

  @ApiProperty({
    example: 'MyStrongP4ssword',
    description: 'Contraseña (mín. 8 chars, mayúsculas/minúsculas/número)',
    minLength: 8,
    maxLength: 72,
  })
  @IsNotEmpty({ message: 'Contraseña es requerida' })
  @MinLength(8, { message: 'Contraseña debe tener mínimo 8 caracteres' })
  @MaxLength(72, { message: 'Contraseña no puede exceder 72 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Contraseña debe incluir mayúscula, minúscula y número',
  })
  password!: string;

  @ApiProperty({
    example: 'Alex N',
    description: 'Nombre completo del usuario',
    minLength: 3,
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Nombre completo es requerido' })
  @MinLength(3, { message: 'Nombre debe tener mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nombre no puede exceder 100 caracteres' })
  fullName!: string;

  @ApiProperty({
    example: 'uuid-de-empresa',
    description: 'ID de la empresa asociada',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
