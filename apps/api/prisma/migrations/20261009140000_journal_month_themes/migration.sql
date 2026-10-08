-- AlterTable
ALTER TABLE `journals` ADD COLUMN `month_themes` JSON NULL;

-- A journal's theme becomes the theme of every month of its period.
UPDATE `journals` AS `j`
JOIN (
    WITH RECURSIVE `months` AS (
        SELECT `id`, `theme`, `end_date`, CAST(DATE_FORMAT(`start_date`, '%Y-%m-01') AS DATE) AS `month`
        FROM `journals`
        WHERE `theme` IS NOT NULL
        UNION ALL
        SELECT `id`, `theme`, `end_date`, `month` + INTERVAL 1 MONTH
        FROM `months`
        WHERE `month` + INTERVAL 1 MONTH <= `end_date`
    )
    SELECT `id`, JSON_OBJECTAGG(DATE_FORMAT(`month`, '%Y-%m'), `theme`) AS `themes`
    FROM `months`
    GROUP BY `id`
) AS `t` ON `t`.`id` = `j`.`id`
SET `j`.`month_themes` = `t`.`themes`;

-- AlterTable
ALTER TABLE `journals` DROP COLUMN `theme`;
