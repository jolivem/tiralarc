-- A template now holds both languages in one row (admins write them together, /admin/sheet-templates).

-- New columns, nullable while they are filled.
ALTER TABLE `sheet_templates`
    ADD COLUMN `title_fr` VARCHAR(120) NULL,
    ADD COLUMN `body_fr` TEXT NULL,
    ADD COLUMN `title_en` VARCHAR(120) NULL,
    ADD COLUMN `body_en` TEXT NULL,
    ADD COLUMN `hidden` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Each French template takes its English twin (same category and position)...
UPDATE `sheet_templates` AS fr
    LEFT JOIN `sheet_templates` AS en
        ON en.`locale` = 'en' AND en.`category` = fr.`category` AND en.`position` = fr.`position`
SET fr.`title_fr` = fr.`title`,
    fr.`body_fr` = fr.`body`,
    fr.`title_en` = COALESCE(en.`title`, fr.`title`),
    fr.`body_en` = COALESCE(en.`body`, fr.`body`)
WHERE fr.`locale` = 'fr';

-- ...whose own rows go; an English one without a French twin keeps its words in both.
DELETE en FROM `sheet_templates` AS en
    JOIN `sheet_templates` AS fr
        ON fr.`locale` = 'fr' AND fr.`category` = en.`category` AND fr.`position` = en.`position`
WHERE en.`locale` = 'en';
UPDATE `sheet_templates`
SET `title_fr` = `title`, `body_fr` = `body`, `title_en` = `title`, `body_en` = `body`
WHERE `locale` = 'en';

-- DropIndex
DROP INDEX `sheet_templates_category_locale_idx` ON `sheet_templates`;

-- AlterTable
ALTER TABLE `sheet_templates`
    DROP COLUMN `title`,
    DROP COLUMN `body`,
    DROP COLUMN `locale`,
    MODIFY `title_fr` VARCHAR(120) NOT NULL,
    MODIFY `body_fr` TEXT NOT NULL,
    MODIFY `title_en` VARCHAR(120) NOT NULL,
    MODIFY `body_en` TEXT NOT NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- CreateIndex
CREATE INDEX `sheet_templates_category_position_idx` ON `sheet_templates`(`category`, `position`);
