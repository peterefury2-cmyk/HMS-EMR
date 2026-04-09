import {
  IsArray,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@prisma/client';

export class AnalyzeSymptomsDto {
  @ApiProperty({ type: [String], example: ['fever', 'cough', 'headache'] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  symptoms: string[];

  @ApiPropertyOptional({ description: 'Patient age in years' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(150)
  patientAge?: number;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  patientGender?: Gender;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  patientId?: string;
}
