import { TaskStatus, DocumentType, TransactionType } from './enums';
export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
}
export declare class CreateUserDto {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    roleId: string;
    tenantId?: string;
}
export declare class UpdateUserDto {
    email?: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    roleId?: string;
}
export declare class CreateRoleDto {
    name: string;
    description?: string;
    permissions: string[];
    tenantId?: string;
}
export declare class UpdateRoleDto {
    name?: string;
    description?: string;
    permissions?: string[];
}
export declare class CreateProjectDto {
    name: string;
    description?: string;
    tenantId?: string;
}
export declare class UpdateProjectDto {
    name?: string;
    description?: string;
}
export declare class CreateTaskDto {
    title: string;
    description?: string;
    status: TaskStatus;
    projectId: string;
    assigneeId?: string;
    tenantId?: string;
}
export declare class UpdateTaskDto {
    title?: string;
    description?: string;
    status?: TaskStatus;
    assigneeId?: string;
}
export declare class CreateDocumentDto {
    title: string;
    content: string;
    type: DocumentType;
    authorId: string;
    tenantId?: string;
}
export declare class UpdateDocumentDto1 {
    title?: string;
    content?: string;
    type?: DocumentType;
}
export declare class CreateProductDto {
    name: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
    tenantId?: string;
}
export declare class UpdateProductDto {
    name?: string;
    description?: string;
    price?: number;
    stock?: number;
    category?: string;
}
export declare class CreateTransactionDto {
    description: string;
    amount: number;
    type: TransactionType;
    category?: string;
    createdBy: string;
    tenantId?: string;
}
export declare class UpdateTransactionDto {
    description?: string;
    amount?: number;
    type?: TransactionType;
    category?: string;
}
export declare class PaginationDto {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}
export declare class CreateNotificationTemplateDto {
    name: string;
    subject: string;
    content: string;
    type: string;
    variables?: Record<string, any>;
    isActive?: boolean;
    createdBy: string;
    tenantId?: string;
}
export declare class UpdateNotificationTemplateDto {
    name?: string;
    subject?: string;
    content?: string;
    type?: string;
    variables?: Record<string, any>;
    isActive?: boolean;
}
export declare class CreateNotificationRuleDto {
    name: string;
    templateId: string;
    trigger: string;
    conditions: any[];
    recipients: any[];
    isActive?: boolean;
    createdBy: string;
    tenantId?: string;
}
export declare class UpdateNotificationRuleDto {
    name?: string;
    templateId?: string;
    trigger?: string;
    conditions?: any[];
    recipients?: any[];
    isActive?: boolean;
}
export declare class SendNotificationDto {
    templateId: string;
    recipientIds: string[];
    variables?: Record<string, any>;
    contextId?: string;
    contextType?: string;
    createdBy: string;
    tenantId?: string;
}
export declare class NotificationQueryDto extends PaginationDto {
    userId?: string;
    status?: string;
    type?: string;
    contextType?: string;
    contextId?: string;
}
export declare class CreateKnowledgeDocumentDto {
    title: string;
    content: string;
    summary?: string;
    type: 'WIKI' | 'SOP' | 'PLAYBOOK' | 'TEMPLATE';
    tags?: string[];
    parentId?: string;
    tenantId?: string;
}
export declare class UpdateDocumentDto {
    title?: string;
    content?: string;
    summary?: string;
    tags?: string[];
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    changeLog?: string;
}
export declare class DocumentQueryDto {
    type?: 'WIKI' | 'SOP' | 'PLAYBOOK' | 'TEMPLATE';
    status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
    authorId?: string;
    tags?: string[];
    search?: string;
    parentId?: string;
    page?: number;
    limit?: number;
}
//# sourceMappingURL=dtos.d.ts.map