import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RoleName } from '../../generated/prisma/client.js';

export class CreateUserDto {
  @ApiProperty({ example: 'Tony Mwamba' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'tony' })
  @IsString()
  username!: string;

  @ApiProperty({ example: 'tony@aiqltd.co.tz' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '0700000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: RoleName, example: RoleName.STAFF })
  @IsEnum(RoleName)
  role!: RoleName;
}
