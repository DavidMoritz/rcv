-- Add missing color column to entries table
-- Run this: mysql -u rcv_user -p'rcv_password' rcv_db < add-color-column.sql

USE rcv_db;

ALTER TABLE entries ADD COLUMN color VARCHAR(7) AFTER hyperlink;

SELECT 'Color column added successfully!' AS message;
