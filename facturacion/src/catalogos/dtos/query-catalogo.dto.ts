import { IsOptional, IsString, IsInt, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryCatalogoSearchDto {
  @ApiPropertyOptional({
    description: 'Término de búsqueda (Full Text Search)',
  })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

export class QueryCatalogoRegimenDto {
  @ApiPropertyOptional({
    description: 'Filtro por tipo de persona',
    enum: ['fisica', 'moral', 'todos'],
  })
  @IsOptional()
  @IsIn(['fisica', 'moral', 'todos'])
  tipo: 'fisica' | 'moral' | 'todos' = 'todos';
}
