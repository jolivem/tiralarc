-- Up to 5 departments instead of one: the chosen one (if any) becomes the first.
ALTER TABLE `archer_profiles` ADD COLUMN `departments` JSON NULL;

UPDATE `archer_profiles`
    SET `departments` = IF(`department` IS NULL, JSON_ARRAY(), JSON_ARRAY(`department`));

ALTER TABLE `archer_profiles` MODIFY `departments` JSON NOT NULL,
    DROP COLUMN `department`;
