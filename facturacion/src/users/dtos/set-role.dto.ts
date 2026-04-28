import { IsIn, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetRoleDto {
  @ApiProperty({
    enum: ['user', 'admin', 'cajero', 'contador'],
    example: 'user',
    description: 'Rol del usuario',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rol es requerido' })
  @IsIn(['user', 'admin', 'cajero', 'contador'], {
    message: 'El rol debe ser: user, admin, cajero o contador',
  })
  role!: string;
}
