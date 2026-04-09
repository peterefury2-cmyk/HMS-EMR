import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RecordVitalsDto {
  @ApiPropertyOptional({ description: 'Temperature in Celsius' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(45)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(40)
  @Max(300)
  bloodPressureSystolic?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(200)
  bloodPressureDiastolic?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  heartRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(4)
  @Max(60)
  respiratoryRate?: number;

  @ApiPropertyOptional({ description: 'Oxygen saturation percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ description: 'Weight in kilograms' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;

  @ApiPropertyOptional({ description: 'Height in centimeters' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  height?: number;
}
