-- AlterTable
ALTER TABLE `archer_profiles` ADD COLUMN `calendar_feed_token_hash` CHAR(64) NULL,
    ADD COLUMN `coach_emails` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `coach_notified_at` DATETIME(3) NULL,
    ADD COLUMN `competition_reminders` BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE `goals` ADD COLUMN `discipline` ENUM('INDOOR', 'TAE_NATIONAL', 'TAE_INTERNATIONAL', 'THREE_D', 'FIELD', 'BEURSAULT', 'RUN_ARCHERY', 'NATURE') NULL,
    ADD COLUMN `distance_meters` SMALLINT NULL,
    ADD COLUMN `metric` ENUM('SCORE', 'ARROWS') NULL,
    ADD COLUMN `target` INTEGER NULL;

-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `reminder_sent_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_demo` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX `archer_profiles_calendar_feed_token_hash_key` ON `archer_profiles`(`calendar_feed_token_hash`);
