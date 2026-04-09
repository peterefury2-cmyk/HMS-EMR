import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AppointmentType } from '@prisma/client';

export class CreateAppointmentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ description: 'ISO 8601 datetime string' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ default: 30, description: 'Duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  duration?: number;

  @ApiProperty({ enum: AppointmentType })
  @IsEnum(AppointmentType)
  type: AppointmentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
