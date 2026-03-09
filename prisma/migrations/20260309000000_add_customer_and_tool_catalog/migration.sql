-- Add customer role to enum.
-- Split from tool catalog/table creation to avoid PostgreSQL enum transaction restrictions.
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CUSTOMER';
