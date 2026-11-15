-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `sky` ENUM('SUNNY', 'PARTLY_CLOUDY', 'CLOUDY', 'RAINY') NULL,
    ADD COLUMN `temperature_c` TINYINT NULL,
    ADD COLUMN `wind` ENUM('CALM', 'LIGHT', 'MODERATE', 'STRONG') NULL;
