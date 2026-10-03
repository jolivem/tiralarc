-- Separate database for automated tests (e2e), plus the shadow DB used by `prisma migrate dev`.
CREATE DATABASE IF NOT EXISTS tiralarc_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS tiralarc_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON tiralarc_test.* TO 'tiralarc'@'%';
GRANT ALL PRIVILEGES ON tiralarc_shadow.* TO 'tiralarc'@'%';
FLUSH PRIVILEGES;
