import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ description: 'TOTP token from authenticator app' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
