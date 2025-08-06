import { IsEnum } from 'class-validator';
import { PTOStatus } from '@prisma/client';

// Local enum definition to ensure it's available at runtime
enum PTOStatusEnum {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export class UpdatePtoStatusDto {
  @IsEnum(PTOStatusEnum)
  status: PTOStatus;
}
