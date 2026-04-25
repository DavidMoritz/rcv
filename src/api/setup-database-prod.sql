# ************************************************************
# RCV Database Setup - Production Schema
# Based on production dump from rankedchoices.com
# Last synced: 2026-02-05
# ************************************************************

-- Create database and user
CREATE DATABASE IF NOT EXISTS rcv_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'rcv_user'@'localhost' IDENTIFIED BY 'rcv_password';
GRANT ALL PRIVILEGES ON rcv_db.* TO 'rcv_user'@'localhost';
FLUSH PRIVILEGES;

USE rcv_db;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
SET NAMES utf8mb4;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE='NO_AUTO_VALUE_ON_ZERO', SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;


# Dump of table ballots
# ------------------------------------------------------------

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
  `kickbackUrl` varchar(2048) DEFAULT NULL,
  `iframeUrl` varchar(2048) DEFAULT NULL,
  `oneDeviceOneVote` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `key` (`key`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;



# Dump of table contributions
# ------------------------------------------------------------

CREATE TABLE `contributions` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `value` float DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



# Dump of table entries
# ------------------------------------------------------------

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



# Dump of table random_codes
# ------------------------------------------------------------

CREATE TABLE `random_codes` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `code` varchar(6) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;



# Dump of table users
# ------------------------------------------------------------

CREATE TABLE `users` (
  `id` bigint NOT NULL,
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



# Dump of table votes
# ------------------------------------------------------------

CREATE TABLE `votes` (
  `ballotId` int NOT NULL,
  `vote` text NOT NULL,
  `voteIds` text,
  `ipAddress` varchar(64) NOT NULL,
  `vote_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(40) NOT NULL DEFAULT '',
  `date_created` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `fingerprint` varchar(64) NOT NULL DEFAULT '',
  PRIMARY KEY (`vote_id`),
  UNIQUE KEY `NoDuplicates` (`ballotId`,`voteIds`(25),`name`,`ipAddress`,`date_created`),
  KEY `idx_ballot_fingerprint` (`ballotId`,`fingerprint`)
) ENGINE=MyISAM DEFAULT CHARSET=utf8mb3;




/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
