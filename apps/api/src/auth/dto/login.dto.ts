import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@aiqltd.co.tz' })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({ example: 'Admin@HireFlow1' })
  @IsString()
  @MinLength(8)
  password!: string;
}
