export interface AbilityRequirement {
    action: string;
    subject: string;
    field?: string;
}
export interface JwtPayload {
    sub: string;
    username: string;
    role: string;
    tenantId?: string;
    iat?: number;
    exp?: number;
}
export interface RequestUser {
    id: string;
    email: string;
    username: string;
    role: {
        id: string;
        name: string;
        permissions: string[];
    };
    tenantId?: string;
}
export interface HealthCheckResult {
    status: 'ok' | 'error';
    info?: Record<string, any>;
    error?: Record<string, any>;
    details?: Record<string, any>;
}
export interface MetricsData {
    [key: string]: number | string;
}
export interface AuditContext {
    userId?: string;
    ipAddress?: string;
    userAgent?: string;
    tenantId?: string;
}
export interface SoftDeleteOptions {
    includeDeleted?: boolean;
    deletedOnly?: boolean;
}
export interface FilterOptions {
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: Record<string, any>;
}
export interface BulkOperationResult {
    success: boolean;
    processed: number;
    errors: string[];
}
export interface NotificationTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
    type: 'email' | 'push' | 'sms';
    variables: string[];
}
export interface WebhookPayload {
    event: string;
    data: any;
    timestamp: Date;
    tenantId?: string;
}
//# sourceMappingURL=interfaces.d.ts.map