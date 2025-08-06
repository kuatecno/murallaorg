import { IsDateString, IsDecimal, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePtoRequestDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsDecimal({ decimal_digits: '0,2' })
  totalDays: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
