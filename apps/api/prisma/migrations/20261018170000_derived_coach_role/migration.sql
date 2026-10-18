-- Nobody picks their roles any more: every account is an archer...
INSERT IGNORE INTO `user_roles` (`user_id`, `role`, `created_at`)
SELECT `id`, 'ARCHER', CURRENT_TIMESTAMP(3) FROM `users`;

-- ...and COACH is no longer stored: a user is a coach while a coach invitation they accepted
-- still exists (profile_invitations.coach_id).
DELETE FROM `user_roles` WHERE `role` = 'COACH';
