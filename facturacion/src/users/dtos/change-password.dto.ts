import {
  IsString,
  Matches,
  MaxLength,
  MinLength,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentP4ssword',
    description: 'Contraseña actual',
  })
  @IsString()
  @IsNotEmpty({ message: 'Contraseña actual es requerida' })
  @MinLength(1)
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStrongP4ssword',
    description:
      'Nueva contraseña (mín. 8 chars, mayúsculas/minúsculas/número)',
    minLength: 8,
    maxLength: 72,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nueva contraseña es requerida' })
  @MinLength(8, { message: 'Contraseña debe tener mínimo 8 caracteres' })
  @MaxLength(72, { message: 'Contraseña no puede exceder 72 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'La nueva contraseña debe tener mayúsculas, minúsculas y números',
  })
  newPassword!: string;
}
