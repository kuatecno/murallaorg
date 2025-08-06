-- Notification system schema additions
-- This will be added to the main schema.prisma file

enum NotificationType {
  EMAIL
  PUSH
  IN_APP
  SMS
}

enum NotificationStatus {
  PENDING
  SENT
  FAILED
  CANCELLED
}

enum RuleTrigger {
  TASK_CREATED
  TASK_UPDATED
  TASK_COMPLETED
  DOCUMENT_CREATED
  DOCUMENT_UPDATED
  USER_REGISTERED
  PROJECT_CREATED
  DEADLINE_APPROACHING
  STOCK_LOW
  CUSTOM
}

model NotificationTemplate {
  id          String   @id @default(cuid())
  name        String   @unique
  description String?
  type        NotificationType
  subject     String?  // For email notifications
  content     String   @db.Text // Template content with variables
  variables   String[] // Available template variables
  isActive    Boolean  @default(true)
  createdBy   String
  creator     User     @relation("NotificationTemplateCreator", fields: [createdBy], references: [id])
  rules       NotificationRule[]
  notifications Notification[]
  tenantId    String?  // For future multi-tenant support
  isDeleted   Boolean  @default(false)
  deletedAt   DateTime?
  deletedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("notification_templates")
}

model NotificationRule {
  id          String      @id @default(cuid())
  name        String
  description String?
  trigger     RuleTrigger
  conditions  Json        // JSON conditions for rule evaluation
  isActive    Boolean     @default(true)
  templateId  String
  template    NotificationTemplate @relation(fields: [templateId], references: [id])
  recipients  Json        // JSON array of recipient rules
  delay       Int?        // Delay in minutes before sending
  createdBy   String
  creator     User        @relation("NotificationRuleCreator", fields: [createdBy], references: [id])
  notifications Notification[]
  tenantId    String?     // For future multi-tenant support
  isDeleted   Boolean     @default(false)
  deletedAt   DateTime?
  deletedBy   String?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@map("notification_rules")
}

model Notification {
  id          String             @id @default(cuid())
  type        NotificationType
  status      NotificationStatus @default(PENDING)
  subject     String?
  content     String             @db.Text
  recipientId String
  recipient   User               @relation("NotificationRecipient", fields: [recipientId], references: [id])
  templateId  String?
  template    NotificationTemplate? @relation(fields: [templateId], references: [id])
  ruleId      String?
  rule        NotificationRule?  @relation(fields: [ruleId], references: [id])
  entityType  String?            // Related entity type (Task, Document, etc.)
  entityId    String?            // Related entity ID
  metadata    Json?              // Additional notification data
  scheduledAt DateTime?          // When to send the notification
  sentAt      DateTime?          // When notification was sent
  failedAt    DateTime?          // When notification failed
  errorMessage String?           // Error details if failed
  readAt      DateTime?          // When recipient read the notification
  tenantId    String?            // For future multi-tenant support
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt

  @@map("notifications")
  @@index([recipientId, status])
  @@index([scheduledAt])
  @@index([entityType, entityId])
}

-- Additional User relations to add:
-- notificationTemplatesCreated NotificationTemplate[] @relation("NotificationTemplateCreator")
-- notificationRulesCreated NotificationRule[] @relation("NotificationRuleCreator")
-- notifications Notification[] @relation("NotificationRecipient")
