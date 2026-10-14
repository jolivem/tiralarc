-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `custom_type_id` CHAR(36) NULL,
    MODIFY `type` ENUM('TRAINING', 'COACHING', 'COMPETITION', 'STRENGTH', 'OTHER', 'CUSTOM') NOT NULL;

-- CreateTable
CREATE TABLE `custom_event_types` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `title` VARCHAR(40) NOT NULL,
    `color` VARCHAR(20) NOT NULL,
    `icon` VARCHAR(20) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `custom_event_types_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `journal_sessions_custom_type_id_idx` ON `journal_sessions`(`custom_type_id`);

-- AddForeignKey
ALTER TABLE `journal_sessions` ADD CONSTRAINT `journal_sessions_custom_type_id_fkey` FOREIGN KEY (`custom_type_id`) REFERENCES `custom_event_types`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `custom_event_types` ADD CONSTRAINT `custom_event_types_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
