-- A journal is now a period: its events are the archer's sessions dated within it.

-- DropForeignKey
ALTER TABLE `journal_sessions` DROP FOREIGN KEY `journal_sessions_journal_id_fkey`;

-- DropIndex
DROP INDEX `journal_sessions_journal_id_date_idx` ON `journal_sessions`;

-- AlterTable
ALTER TABLE `journal_sessions` DROP COLUMN `journal_id`;
