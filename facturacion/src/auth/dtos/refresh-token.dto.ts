import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token emitido en login/refresh',
    example: 'rt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty({ message: 'refreshToken es requerido' })
  @MinLength(20)
  @MaxLength(2048)
  refreshToken!: string;
}
