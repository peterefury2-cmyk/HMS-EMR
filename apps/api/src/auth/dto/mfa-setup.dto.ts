import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class MfaSetupDto {
  @ApiProperty({ description: 'User ID to setup MFA for' })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
