import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRoleDto {
  @ApiProperty({
    enum: ['user', 'admin'],
    example: 'user',
    description: 'Rol del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rol es requerido' })
  @IsIn(['user', 'admin'], { message: 'El rol debe ser user o admin' })
  role!: string;
}
