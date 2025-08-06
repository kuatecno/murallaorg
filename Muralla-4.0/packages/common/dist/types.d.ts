export interface User {
    id: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
    roleId: string;
    role?: Role;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Role {
    id: string;
    name: string;
    description?: string;
    permissions: string[];
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Project {
    id: string;
    name: string;
    description?: string;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Task {
    id: string;
    title: string;
    description?: string;
    status: string;
    projectId: string;
    assigneeId?: string;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Document {
    id: string;
    title: string;
    content: string;
    type: string;
    authorId: string;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Product {
    id: string;
    name: string;
    description?: string;
    price: number;
    stock: number;
    category?: string;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface Transaction {
    id: string;
    description: string;
    amount: number;
    type: string;
    category?: string;
    createdBy: string;
    tenantId?: string;
    isDeleted: boolean;
    deletedAt?: Date;
    deletedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface PaginationArgs {
    first?: number;
    after?: string;
    last?: number;
    before?: string;
}
export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startCursor?: string;
    endCursor?: string;
}
export interface Connection<T> {
    edges: Edge<T>[];
    pageInfo: PageInfo;
    totalCount?: number;
}
export interface Edge<T> {
    node: T;
    cursor: string;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface LoginResponse {
    access_token: string;
    user: User;
}
export interface AuditTrail {
    id: string;
    tableName: string;
    recordId: string;
    operation: string;
    beforeData?: any;
    afterData?: any;
    userId?: string;
    tenantId?: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
}
//# sourceMappingURL=types.d.ts.map