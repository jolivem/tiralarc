-- AlterTable
ALTER TABLE `journal_sessions` MODIFY `discipline` ENUM('INDOOR', 'TAE_NATIONAL', 'TAE_INTERNATIONAL', 'THREE_D', 'FIELD', 'BEURSAULT', 'RUN_ARCHERY') NULL;

-- CreateTable
CREATE TABLE `archer_profiles` (
    `user_id` CHAR(36) NOT NULL,
    `licence_number` VARCHAR(20) NULL,
    `category` ENUM('U11', 'U13', 'U15', 'U18', 'U21', 'S1', 'S2', 'S3') NULL,
    `bow_type` ENUM('RECURVE', 'COMPOUND', 'BAREBOW', 'LONGBOW', 'HUNTING', 'FREE') NULL,
    `disciplines` JSON NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `profile_invitations` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `is_coach` BOOLEAN NOT NULL DEFAULT false,
    `token_hash` CHAR(64) NOT NULL,
    `accepted_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `profile_invitations_token_hash_key`(`token_hash`),
    UNIQUE INDEX `profile_invitations_user_id_email_key`(`user_id`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorite_sites` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `label` VARCHAR(100) NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `favorite_sites_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `archer_profiles` ADD CONSTRAINT `archer_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_invitations` ADD CONSTRAINT `profile_invitations_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `favorite_sites` ADD CONSTRAINT `favorite_sites_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

