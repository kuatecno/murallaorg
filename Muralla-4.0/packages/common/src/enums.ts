// Shared enums used across the application

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}

export enum DocumentType {
  WIKI = 'WIKI',
  SOP = 'SOP',
  PLAYBOOK = 'PLAYBOOK',
  TEMPLATE = 'TEMPLATE'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum AuditOperation {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  RESTORE = 'RESTORE'
}

export enum RoleType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  GUEST = 'guest'
}

export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage'
}
