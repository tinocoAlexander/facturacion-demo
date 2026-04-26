import { IsString, MaxLength, MinLength, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiProperty({
    example: 'Alex N',
    description: 'Nombre completo (se recorta con trim)',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nombre completo es requerido' })
  @MinLength(2, { message: 'Nombre debe tener mínimo 2 caracteres' })
  @MaxLength(100, { message: 'Nombre no puede exceder 100 caracteres' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  fullName!: string;
}
