-- AlterTable
ALTER TABLE `journal_sessions` ADD COLUMN `planned_by_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `profile_invitations` ADD COLUMN `coach_access` ENUM('READ', 'WRITE') NULL,
    ADD COLUMN `coach_id` CHAR(36) NULL;

-- Coaches invited before access existed may read (they still have to accept again while signed in).
UPDATE `profile_invitations` SET `coach_access` = 'READ' WHERE `is_coach` = TRUE;

-- CreateIndex
CREATE INDEX `journal_sessions_planned_by_id_idx` ON `journal_sessions`(`planned_by_id`);

-- CreateIndex
CREATE INDEX `profile_invitations_coach_id_idx` ON `profile_invitations`(`coach_id`);

-- CreateIndex
CREATE UNIQUE INDEX `profile_invitations_user_id_coach_id_key` ON `profile_invitations`(`user_id`, `coach_id`);

-- AddForeignKey
ALTER TABLE `journal_sessions` ADD CONSTRAINT `journal_sessions_planned_by_id_fkey` FOREIGN KEY (`planned_by_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `profile_invitations` ADD CONSTRAINT `profile_invitations_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
