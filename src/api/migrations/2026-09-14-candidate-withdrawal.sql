ALTER TABLE `entries`
  ADD COLUMN `withdrawnAt` datetime DEFAULT NULL,
  ADD COLUMN `withdrawnReason` varchar(256) NOT NULL DEFAULT '';
