-- AlterTable
ALTER TABLE `archer_profiles` ADD COLUMN `first_name` VARCHAR(60) NULL,
    ADD COLUMN `last_name` VARCHAR(60) NULL;

-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `score_sheet_checked_on` DATE NULL;
