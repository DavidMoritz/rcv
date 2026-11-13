-- Add cached_info table for caching computed stats (about page, etc.)
CREATE TABLE IF NOT EXISTS `cached_info` (
  `key` varchar(64) NOT NULL,
  `value` json NOT NULL,
  `updated` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
