-- CreateTable
CREATE TABLE `journals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `journals_user_id_start_date_idx`(`user_id`, `start_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `journals` ADD CONSTRAINT `journals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing sessions: one journal per archer, spanning the seasons (1 Sept – 31 Aug) they cover.
INSERT INTO `journals` (`id`, `user_id`, `title`, `start_date`, `end_date`, `updated_at`)
SELECT UUID(), `user_id`,
    CONCAT('Journal ', `first_year`, '-', `last_year` + 1),
    MAKEDATE(`first_year`, 1) + INTERVAL 8 MONTH,
    MAKEDATE(`last_year` + 1, 1) + INTERVAL 8 MONTH - INTERVAL 1 DAY,
    CURRENT_TIMESTAMP(3)
FROM (
    SELECT `user_id`,
        YEAR(MIN(`date`) - INTERVAL 8 MONTH) AS `first_year`,
        YEAR(MAX(`date`) - INTERVAL 8 MONTH) AS `last_year`
    FROM `journal_sessions`
    GROUP BY `user_id`
) AS `seasons`;

-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `journal_id` CHAR(36) NULL;

UPDATE `journal_sessions` AS `s`
JOIN `journals` AS `j` ON `j`.`user_id` = `s`.`user_id`
SET `s`.`journal_id` = `j`.`id`;

ALTER TABLE `journal_sessions` MODIFY `journal_id` CHAR(36) NOT NULL;

-- CreateIndex
CREATE INDEX `journal_sessions_journal_id_date_idx` ON `journal_sessions`(`journal_id`, `date`);

-- AddForeignKey
ALTER TABLE `journal_sessions` ADD CONSTRAINT `journal_sessions_journal_id_fkey` FOREIGN KEY (`journal_id`) REFERENCES `journals`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
