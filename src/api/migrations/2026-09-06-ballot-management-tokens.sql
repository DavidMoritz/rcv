CREATE TABLE IF NOT EXISTS `ballot_management_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `ballot_id` int NOT NULL,
  `token_digest` char(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `created_at` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()),
  `claimed_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_digest` (`token_digest`),
  KEY `ballot_id` (`ballot_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

