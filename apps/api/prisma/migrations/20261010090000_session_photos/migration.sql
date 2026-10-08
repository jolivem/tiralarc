-- CreateTable
CREATE TABLE `session_photos` (
    `id` CHAR(36) NOT NULL,
    `session_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `width` SMALLINT NOT NULL,
    `height` SMALLINT NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `session_photos_session_id_created_at_idx`(`session_id`, `created_at`),
    INDEX `session_photos_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `session_photos` ADD CONSTRAINT `session_photos_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `journal_sessions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `session_photos` ADD CONSTRAINT `session_photos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
