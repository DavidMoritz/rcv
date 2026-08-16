ALTER TABLE `votes`
  ADD COLUMN `requestKey` varchar(64) DEFAULT NULL AFTER `group_answers`,
  ADD COLUMN `requestHash` char(64) DEFAULT NULL AFTER `requestKey`,
  ADD UNIQUE KEY `idx_ballot_request` (`ballotId`, `requestKey`);
