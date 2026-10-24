-- AlterTable
ALTER TABLE `archer_profiles` ADD COLUMN `department` VARCHAR(3) NULL,
    ADD COLUMN `para_competitions` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `journal_sessions` MODIFY `discipline` ENUM('INDOOR', 'TAE_NATIONAL', 'TAE_INTERNATIONAL', 'THREE_D', 'FIELD', 'BEURSAULT', 'RUN_ARCHERY', 'NATURE') NULL;
