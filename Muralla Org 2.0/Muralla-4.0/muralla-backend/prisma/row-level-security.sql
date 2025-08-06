-- Row-Level Security (RLS) Policies for Multi-Tenant Support
-- This file contains SQL commands to enable RLS on all tables
-- Run these commands manually in your PostgreSQL database when ready for multi-tenant mode

-- Enable RLS on all tables (tenant_id columns already exist from Prisma schema)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;

-- Note: tenant_id columns are now part of the Prisma schema and migration

-- Create function to get current tenant from JWT token
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
BEGIN
  -- Extract tenant_id from JWT token in current_setting
  -- This would be set by your application when processing requests
  RETURN current_setting('app.current_tenant_id', true)::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get current user ID from JWT token
CREATE OR REPLACE FUNCTION current_user_id() RETURNS TEXT AS $$
BEGIN
  -- Extract user_id from JWT token in current_setting
  RETURN current_setting('app.current_user_id', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('app.user_role', true) = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table policies
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

CREATE POLICY users_own_record ON users
  FOR ALL
  USING (id = current_user_id() OR is_admin());

-- Roles table policies
CREATE POLICY roles_tenant_isolation ON roles
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

-- Projects table policies
CREATE POLICY projects_tenant_isolation ON projects
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

-- Tasks table policies
CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

CREATE POLICY tasks_assignee_access ON tasks
  FOR SELECT
  USING ("assigneeId" = current_user_id());

-- Documents table policies
CREATE POLICY documents_tenant_isolation ON documents
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

CREATE POLICY documents_author_access ON documents
  FOR ALL
  USING ("authorId" = current_user_id());

-- Products table policies
CREATE POLICY products_tenant_isolation ON products
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

-- Sales table policies
CREATE POLICY sales_tenant_isolation ON sales
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

CREATE POLICY sales_seller_access ON sales
  FOR ALL
  USING ("soldBy" = current_user_id());

-- Transactions table policies
CREATE POLICY transactions_tenant_isolation ON transactions
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

CREATE POLICY transactions_creator_access ON transactions
  FOR ALL
  USING ("createdBy" = current_user_id());

-- Audit trail policies
CREATE POLICY audit_tenant_isolation ON audit_trail
  FOR ALL
  USING ("tenantId" = current_tenant_id()::text OR is_admin());

-- Soft delete policies (hide deleted records from regular users)
CREATE POLICY users_hide_deleted ON users
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY roles_hide_deleted ON roles
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY projects_hide_deleted ON projects
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY tasks_hide_deleted ON tasks
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY documents_hide_deleted ON documents
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY products_hide_deleted ON products
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY sales_hide_deleted ON sales
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

CREATE POLICY transactions_hide_deleted ON transactions
  FOR SELECT
  USING ("isDeleted" = FALSE OR is_admin());

-- Example of how to set context in your application:
-- SELECT set_config('app.current_tenant_id', 'your-tenant-uuid', true);
-- SELECT set_config('app.current_user_id', 'your-user-id', true);
-- SELECT set_config('app.user_role', 'admin', true);

-- To disable RLS for testing (run as superuser):
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE roles DISABLE ROW LEVEL SECURITY;
-- etc...
