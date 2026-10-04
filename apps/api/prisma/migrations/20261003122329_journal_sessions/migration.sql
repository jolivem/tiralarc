-- CreateTable
CREATE TABLE `journal_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `type` ENUM('TRAINING', 'COACHING', 'COMPETITION', 'STRENGTH') NOT NULL,
    `date` DATE NOT NULL,
    `start_time` VARCHAR(5) NULL,
    `duration_minutes` SMALLINT NULL,
    `location` VARCHAR(200) NULL,
    `discipline` ENUM('INDOOR', 'TAE_NATIONAL', 'TAE_INTERNATIONAL', 'THREE_D', 'FIELD') NULL,
    `distance_meters` SMALLINT NULL,
    `arrow_count` SMALLINT NULL,
    `score` SMALLINT NULL,
    `objective` TEXT NULL,
    `satisfaction` TINYINT NULL,
    `technique` TINYINT NULL,
    `description` TEXT NULL,
    `physical_feeling` ENUM('GREAT', 'OK', 'BAD', 'EXHAUSTED') NULL,
    `mental_feeling` ENUM('GREAT', 'OK', 'BAD', 'EXHAUSTED') NULL,
    `went_well` JSON NOT NULL,
    `to_improve` JSON NOT NULL,
    `next_time` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `journal_sessions_user_id_date_idx`(`user_id`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `journal_sessions` ADD CONSTRAINT `journal_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
