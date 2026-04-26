import { ApiProperty } from '@nestjs/swagger';

export class ResponseUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'user@example.com' })
  email!: string;

  @ApiProperty({ example: 'Alex N' })
  fullName!: string;

  @ApiProperty({ enum: ['user', 'admin'], example: 'user' })
  role!: 'user' | 'admin';

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: 'uuid-empresa', nullable: true })
  empresaId!: string | null;

  @ApiProperty({ example: '2026-04-24T12:34:56.000Z', nullable: true })
  lastLoginAt!: Date | null;

  @ApiProperty({ example: '2026-04-24T12:34:56.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-04-24T12:34:56.000Z' })
  updatedAt!: Date;
}
