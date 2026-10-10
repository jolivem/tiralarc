-- CreateTable
CREATE TABLE `goals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` ENUM('SPORT', 'TECHNIQUE', 'PHYSICAL', 'PERSONAL') NOT NULL,
    `description` VARCHAR(500) NOT NULL,
    `created_on` DATE NOT NULL,
    `achieved_on` DATE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `goals_user_id_created_on_idx`(`user_id`, `created_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `goals` ADD CONSTRAINT `goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
