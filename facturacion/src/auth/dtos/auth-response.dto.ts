import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT access token' })
  accessToken!: string;

  @ApiPropertyOptional({ description: 'Refresh token (si se implementa)' })
  refreshToken?: string;

  @ApiProperty({
    description: 'Datos básicos del usuario autenticado',
    example: {
      id: 1,
      email: 'user@example.com',
      fullName: 'Alex N',
      role: 'user',
    },
  })
  user!: {
    id: number;
    email: string;
    fullName: string;
    role: 'user' | 'admin';
  };
}
