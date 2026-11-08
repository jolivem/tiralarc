-- AlterTable
ALTER TABLE `profile_invitations` ADD COLUMN `coach_group_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `coach_groups` (
    `id` CHAR(36) NOT NULL,
    `coach_id` CHAR(36) NOT NULL,
    `name` VARCHAR(60) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `coach_groups_coach_id_name_key`(`coach_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `profile_invitations_coach_group_id_idx` ON `profile_invitations`(`coach_group_id`);

-- AddForeignKey
ALTER TABLE `profile_invitations` ADD CONSTRAINT `profile_invitations_coach_group_id_fkey` FOREIGN KEY (`coach_group_id`) REFERENCES `coach_groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_groups` ADD CONSTRAINT `coach_groups_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
