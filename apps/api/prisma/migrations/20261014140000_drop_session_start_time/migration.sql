-- Events are a day's entry: they no longer have a time.
ALTER TABLE `journal_sessions` DROP COLUMN `start_time`;
