-- CreateTable
CREATE TABLE `sheet_photos` (
    `id` CHAR(36) NOT NULL,
    `sheet_id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `width` SMALLINT NOT NULL,
    `height` SMALLINT NOT NULL,
    `size_bytes` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `sheet_photos_sheet_id_created_at_idx`(`sheet_id`, `created_at`),
    INDEX `sheet_photos_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `sheet_photos` ADD CONSTRAINT `sheet_photos_sheet_id_fkey` FOREIGN KEY (`sheet_id`) REFERENCES `archer_sheets`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sheet_photos` ADD CONSTRAINT `sheet_photos_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

