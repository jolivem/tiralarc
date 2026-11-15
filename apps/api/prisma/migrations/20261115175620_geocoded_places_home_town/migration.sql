-- AlterTable
ALTER TABLE `archer_profiles` ADD COLUMN `home_latitude` DOUBLE NULL,
    ADD COLUMN `home_longitude` DOUBLE NULL,
    ADD COLUMN `home_town` VARCHAR(100) NULL;

-- CreateTable
CREATE TABLE `geocoded_places` (
    `key` VARCHAR(160) NOT NULL,
    `latitude` DOUBLE NULL,
    `longitude` DOUBLE NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
