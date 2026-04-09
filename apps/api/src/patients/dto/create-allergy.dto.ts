import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Severity } from '@prisma/client';

export class CreateAllergyDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  allergen: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reaction?: string;

  @ApiProperty({ enum: Severity, default: Severity.MODERATE })
  @IsEnum(Severity)
  severity: Severity;
}
