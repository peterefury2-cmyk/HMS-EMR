import { IsString, IsEnum, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { DiagnosisType, IcdVersion } from '@prisma/client';

export class CreateDiagnosisDto {
  @ApiProperty({ example: 'J18.9', description: 'ICD-10 code format: Letter + 2 digits + optional decimal' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/, {
    message: 'icdCode must be a valid ICD format (e.g. J18, J18.9, A01.1)',
  })
  icdCode: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: DiagnosisType })
  @IsEnum(DiagnosisType)
  type: DiagnosisType;

  @ApiProperty({ enum: IcdVersion })
  @IsEnum(IcdVersion)
  icdVersion: IcdVersion;
}
