-- Migrate local database to match production schema exactly
-- Run this: mysql -u rcv_user -p'rcv_password' rcv_db < migrate-to-prod-schema.sql

USE rcv_db;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Fix ballots table
-- First, update NULL maxVotes to 0 (production default behavior)
UPDATE ballots SET maxVotes = 0 WHERE maxVotes IS NULL;

-- Drop foreign key constraint first (it prevents type changes)
ALTER TABLE ballots DROP FOREIGN KEY IF EXISTS ballots_ibfk_1;

-- Now modify columns to match production
ALTER TABLE ballots
  MODIFY COLUMN createdBy VARCHAR(64) NOT NULL,
  MODIFY COLUMN positions VARCHAR(10) NOT NULL,
  MODIFY COLUMN rcvisId INT DEFAULT NULL,
  MODIFY COLUMN maxVotes SMALLINT NOT NULL;

-- Fix users table (add missing columns)
-- Change id to BIGINT to match production
ALTER TABLE users
  MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT,
  ADD COLUMN IF NOT EXISTS role VARCHAR(64) DEFAULT NULL AFTER image,
  ADD COLUMN IF NOT EXISTS clearance SMALLINT NOT NULL DEFAULT 0 AFTER role;

-- Fix entries table (add color column and resize columns)
ALTER TABLE entries
  ADD COLUMN IF NOT EXISTS color VARCHAR(6) DEFAULT NULL AFTER image,
  MODIFY COLUMN image VARCHAR(15600) NOT NULL DEFAULT '',
  MODIFY COLUMN hyperlink VARCHAR(1024) NOT NULL DEFAULT '';

-- Fix random_codes table
ALTER TABLE random_codes
  MODIFY COLUMN code VARCHAR(6) DEFAULT NULL;

-- Fix votes table (add unique constraint)
-- Drop the key if it exists, then add it fresh
ALTER TABLE votes DROP INDEX IF EXISTS NoDuplicates;
ALTER TABLE votes
  ADD UNIQUE KEY NoDuplicates (ballotId, voteIds(25), name, ipAddress, date_created);

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Migration completed! Database now matches production schema.' AS message;
