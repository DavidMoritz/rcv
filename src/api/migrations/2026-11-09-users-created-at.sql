-- Add createdAt timestamp to users table
ALTER TABLE `users` ADD COLUMN `createdAt` datetime NOT NULL DEFAULT (UTC_TIMESTAMP()) AFTER `username`;

-- Backfill from earliest ballot created by each user
UPDATE `users` u
JOIN (
  SELECT `createdBy`, MIN(`timeCreated`) AS firstBallot
  FROM `ballots`
  WHERE `createdBy` != 'guest'
  GROUP BY `createdBy`
) b ON u.id = b.createdBy
SET u.createdAt = b.firstBallot;
