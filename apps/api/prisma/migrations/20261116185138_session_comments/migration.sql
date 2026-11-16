-- CreateTable
CREATE TABLE `session_comments` (
    `id` CHAR(36) NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `coach_id` CHAR(36) NOT NULL,
    `text` TEXT NOT NULL,
    `seen_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `session_comments_session_id_created_at_idx`(`session_id`, `created_at`),
    INDEX `session_comments_coach_id_idx`(`coach_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session_comments` ADD CONSTRAINT `session_comments_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `journal_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_comments` ADD CONSTRAINT `session_comments_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
