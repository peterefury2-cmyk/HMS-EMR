import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { VisitType } from '@prisma/client';

export class CreateVisitDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  doctorId: string;

  @ApiProperty({ enum: VisitType })
  @IsEnum(VisitType)
  type: VisitType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  chiefComplaint: string;
}
