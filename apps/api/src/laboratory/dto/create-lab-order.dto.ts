import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QueuePriority } from '@prisma/client';

export class LabOrderItemDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  labTestId: string;
}

export class CreateLabOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  visitId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ type: [LabOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LabOrderItemDto)
  items: LabOrderItemDto[];

  @ApiPropertyOptional({ enum: QueuePriority, default: QueuePriority.NORMAL })
  @IsOptional()
  @IsEnum(QueuePriority)
  priority?: QueuePriority;
}
