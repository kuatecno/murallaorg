import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsDateString, IsNumber, IsEmail, ValidateNested, IsNotEmpty, IsInt, Min, Max, MinLength, IsObject } from 'class-validator';
import { TaskStatus, DocumentType, TransactionType, RoleType } from './enums';

// Auth DTOs
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  username: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;
}

// User DTOs
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  roleId?: string;
}

// Role DTOs
export class CreateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissions: string[];

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

// Project DTOs
export class CreateProjectDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// Task DTOs
export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateTaskDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsString()
  assigneeId?: string;
}

// Document DTOs
export class CreateDocumentDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsEnum(DocumentType)
  type: DocumentType;

  @IsString()
  authorId: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateDocumentDto1 {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;
}

// Product DTOs
export class CreateProductDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price: number;

  @IsNumber()
  stock: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsNumber()
  stock?: number;

  @IsOptional()
  @IsString()
  category?: string;
}

// Transaction DTOs
export class CreateTransactionDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsOptional()
  @IsString()
  category?: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  category?: string;
}

// Pagination DTOs
export class PaginationDto {
  @IsOptional()
  @IsNumber()
  first?: number;

  @IsOptional()
  @IsString()
  after?: string;

  @IsOptional()
  @IsNumber()
  last?: number;

  @IsOptional()
  @IsString()
  before?: string;
}

// Notification DTOs
export class CreateNotificationTemplateDto {
  @IsString()
  name: string;

  @IsString()
  subject: string;

  @IsString()
  content: string;

  @IsEnum(['email', 'push', 'sms', 'in_app'])
  type: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateNotificationTemplateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsEnum(['email', 'push', 'sms', 'in_app'])
  type?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateNotificationRuleDto {
  @IsString()
  name: string;

  @IsString()
  templateId: string;

  @IsEnum(['task_created', 'task_updated', 'task_completed', 'project_created', 'user_registered', 'custom'])
  trigger: string;

  @IsArray()
  conditions: any[];

  @IsArray()
  recipients: any[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateNotificationRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsEnum(['task_created', 'task_updated', 'task_completed', 'project_created', 'user_registered', 'custom'])
  trigger?: string;

  @IsOptional()
  @IsArray()
  conditions?: any[];

  @IsOptional()
  @IsArray()
  recipients?: any[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class SendNotificationDto {
  @IsString()
  templateId: string;

  @IsArray()
  @IsString({ each: true })
  recipientIds: string[];

  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @IsOptional()
  @IsString()
  contextId?: string;

  @IsOptional()
  @IsString()
  contextType?: string;

  @IsString()
  createdBy: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class NotificationQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsEnum(['unread', 'read', 'all'])
  status?: string;

  @IsOptional()
  @IsEnum(['email', 'push', 'sms', 'in_app'])
  type?: string;

  @IsOptional()
  @IsString()
  contextType?: string;

  @IsOptional()
  @IsString()
  contextId?: string;
}

// ==================== KNOWLEDGE HUB DTOs ====================

export class CreateKnowledgeDocumentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsEnum(['WIKI', 'SOP', 'PLAYBOOK', 'TEMPLATE'])
  type: 'WIKI' | 'SOP' | 'PLAYBOOK' | 'TEMPLATE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsString()
  tenantId?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  changeLog?: string;
}

export class DocumentQueryDto {
  @IsOptional()
  @IsEnum(['WIKI', 'SOP', 'PLAYBOOK', 'TEMPLATE'])
  type?: 'WIKI' | 'SOP' | 'PLAYBOOK' | 'TEMPLATE';

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsOptional()
  @IsString()
  authorId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
