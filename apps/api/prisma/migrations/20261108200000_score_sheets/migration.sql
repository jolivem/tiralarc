-- CreateTable
CREATE TABLE `score_sheets` (
    `session_id` CHAR(36) NOT NULL,
    `pdf` MEDIUMBLOB NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`session_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `score_sheets` ADD CONSTRAINT `score_sheets_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `journal_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
