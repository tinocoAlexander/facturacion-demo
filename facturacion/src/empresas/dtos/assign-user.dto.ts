import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AssignUserDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  userId!: number;
}
