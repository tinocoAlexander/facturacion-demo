import { IsBoolean, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetActiveDto {
  @ApiProperty({
    example: true,
    description: 'Activar o desactivar un usuario',
  })
  @IsBoolean()
  @IsNotEmpty({ message: 'isActive es requerido' })
  isActive!: boolean;
}
