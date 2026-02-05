-- RCV Database Setup - Production Schema
-- Drop and recreate: mysql -u root -p < setup-database-prod.sql

-- Drop existing database
DROP DATABASE IF EXISTS rcv_db;

-- Create database
CREATE DATABASE rcv_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create user (will error if exists, that's ok)
CREATE USER IF NOT EXISTS 'rcv_user'@'localhost' IDENTIFIED BY 'rcv_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON rcv_db.* TO 'rcv_user'@'localhost';
FLUSH PRIVILEGES;

-- Switch to database
USE rcv_db;

-- Ballots table (matches production exactly)
CREATE TABLE `ballots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(64) NOT NULL,
  `key` varchar(255) NOT NULL DEFAULT '',
  `positions` varchar(10) NOT NULL,
  `rcvisSlug` varchar(255) DEFAULT NULL,
  `rcvisId` int DEFAULT NULL,
  `createdBy` varchar(64) NOT NULL,
  `requireSignIn` tinyint(1) NOT NULL,
  `maxVotes` smallint NOT NULL,
  `hideNames` tinyint(1) NOT NULL DEFAULT '0',
  `hideDetails` tinyint(1) DEFAULT '0',
  `tieBreak` varchar(24) NOT NULL DEFAULT 'weighted',
  `voteCutoff` datetime NOT NULL,
  `resultsRelease` datetime NOT NULL,
  `timeCreated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `register` int DEFAULT '0',
  `allowCustom` tinyint(1) NOT NULL DEFAULT '0',
  `showGraph` tinyint(1) NOT NULL DEFAULT '0',
  `graphUpdated` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;

-- Users table (matches production exactly)
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(64) DEFAULT NULL,
  `image` varchar(256) DEFAULT NULL,
  `role` varchar(64) DEFAULT NULL,
  `clearance` smallint NOT NULL DEFAULT '0',
  `password` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `id` (`id`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;

-- Entries table (matches production exactly)
CREATE TABLE `entries` (
  `ballotId` int NOT NULL,
  `name` varchar(256) NOT NULL DEFAULT '',
  `entry_id` int NOT NULL AUTO_INCREMENT,
  `image` varchar(15600) NOT NULL DEFAULT '',
  `color` varchar(6) DEFAULT NULL,
  `hyperlink` varchar(1024) CHARACTER SET utf8mb3 COLLATE utf8mb3_general_ci NOT NULL DEFAULT '',
  PRIMARY KEY (`entry_id`),
  KEY `ballotId_on_entries` (`ballotId`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;

-- Votes table (matches production exactly)
CREATE TABLE `votes` (
  `ballotId` int NOT NULL,
  `vote` text NOT NULL,
  `voteIds` text,
  `ipAddress` varchar(64) NOT NULL,
  `vote_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL DEFAULT '',
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`vote_id`),
  UNIQUE KEY `NoDuplicates` (`ballotId`,`voteIds`(25),`name`,`ipAddress`,`date_created`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;

-- Random codes table (matches production exactly)
CREATE TABLE `random_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(6) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Contributions table (matches production exactly)
CREATE TABLE `contributions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `value` float DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

SELECT 'Database setup complete! Now run seed-data.sql' AS message;
