import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EnterResultDto {
  @ApiProperty({ description: 'Result as string (e.g. "Positive", "5.2")' })
  @IsString()
  @IsNotEmpty()
  result: string;

  @ApiPropertyOptional({ description: 'Numeric value for range comparison' })
  @IsOptional()
  @IsNumber()
  numericResult?: number;

  @ApiPropertyOptional({ description: 'Unit of measurement e.g. mg/dL' })
  @IsOptional()
  @IsString()
  unit?: string;
}
