-- CreateTable
CREATE TABLE `app_reviews` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `stars` TINYINT NOT NULL,
    `comment` TEXT NOT NULL,
    `author_name` VARCHAR(100) NOT NULL,
    `status` ENUM('PENDING', 'PUBLISHED', 'REFUSED') NOT NULL DEFAULT 'PENDING',
    `moderation_token_hash` CHAR(64) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decided_at` DATETIME(3) NULL,

    UNIQUE INDEX `app_reviews_moderation_token_hash_key`(`moderation_token_hash`),
    INDEX `app_reviews_user_id_created_at_idx`(`user_id`, `created_at`),
    INDEX `app_reviews_status_decided_at_idx`(`status`, `decided_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `app_reviews` ADD CONSTRAINT `app_reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
