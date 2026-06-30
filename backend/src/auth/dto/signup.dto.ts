import { IsEmail, IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class SignUpDto {
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(50, { message: 'Password must not exceed 50 characters' })
  password: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  fullName?: string;
}
