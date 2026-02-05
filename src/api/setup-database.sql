-- RCV Local Development Database Setup
-- Run this file as MySQL root user: mysql -u root -p < setup-database.sql

-- Create database
-- CREATE DATABASE IF NOT EXISTS rcv_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- -- Create user
-- CREATE USER IF NOT EXISTS 'rcv_user'@'localhost' IDENTIFIED BY 'rcv_password';

-- -- Grant privileges
-- GRANT ALL PRIVILEGES ON rcv_db.* TO 'rcv_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Switch to database
USE rcv_db;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255),
  image VARCHAR(500),
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ballots table
CREATE TABLE IF NOT EXISTS ballots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  timeCreated DATETIME NOT NULL,
  `key` VARCHAR(50) NOT NULL UNIQUE,
  positions INT NOT NULL DEFAULT 1,
  createdBy INT NOT NULL,
  resultsRelease DATETIME NULL,
  voteCutoff DATETIME NULL,
  requireSignIn TINYINT(1) DEFAULT 0,
  tieBreak VARCHAR(20) DEFAULT 'random',
  register TINYINT(1) DEFAULT 0,
  allowCustom TINYINT(1) DEFAULT 0,
  hideNames TINYINT(1) DEFAULT 0,
  hideDetails TINYINT(1) DEFAULT 0,
  showGraph TINYINT(1) DEFAULT 1,
  maxVotes INT NULL,
  rcvisId VARCHAR(100) NULL,
  rcvisSlug VARCHAR(255) NULL,
  graphUpdated DATETIME NULL,
  FOREIGN KEY (createdBy) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_key (`key`),
  INDEX idx_createdBy (createdBy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Entries table (Candidates/Options)
CREATE TABLE IF NOT EXISTS entries (
  entry_id INT AUTO_INCREMENT PRIMARY KEY,
  ballotId INT NOT NULL,
  name VARCHAR(500) NOT NULL,
  image VARCHAR(500),
  hyperlink VARCHAR(500),
  color VARCHAR(7),
  FOREIGN KEY (ballotId) REFERENCES ballots(id) ON DELETE CASCADE,
  INDEX idx_ballotId (ballotId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Votes table
CREATE TABLE IF NOT EXISTS votes (
  vote_id INT AUTO_INCREMENT PRIMARY KEY,
  ballotId INT NOT NULL,
  date_created DATETIME NOT NULL,
  vote TEXT NOT NULL,
  voteIds TEXT NOT NULL,
  ipAddress VARCHAR(45),
  name VARCHAR(255),
  FOREIGN KEY (ballotId) REFERENCES ballots(id) ON DELETE CASCADE,
  INDEX idx_ballotId (ballotId),
  INDEX idx_date_created (date_created)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Random codes table (For voter verification)
CREATE TABLE IF NOT EXISTS random_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contributions table (For donations/contributions)
CREATE TABLE IF NOT EXISTS contributions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) DEFAULT NULL,
  message TEXT,
  value FLOAT DEFAULT NULL,
  date DATE DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Insert test user (password: testpass123)
INSERT INTO users (username, email, password)
VALUES ('testuser', 'test@example.com', 'testpass123')
ON DUPLICATE KEY UPDATE id=id;

-- Success message
SELECT 'Database setup complete! You can now run: cp config_sample.php config.php' AS message;
