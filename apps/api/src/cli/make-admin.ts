/**
 * Grants the ADMIN role to an existing account (admins can't sign up as such).
 *   pnpm --filter @tiralarc/api user:make-admin jane@example.com
 */
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient, Role } from '../generated/prisma/client.js';

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !process.env.DATABASE_URL) {
  console.error('Usage: user:make-admin <email>   (DATABASE_URL must be set)');
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL) });
try {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with email ${email}. The person must sign up first.`);
    process.exitCode = 1;
  } else {
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: Role.ADMIN } },
      create: { userId: user.id, role: Role.ADMIN },
      update: {},
    });
    console.log(`${email} is now an admin (effective at the next sign-in or token refresh).`);
  }
} finally {
  await prisma.$disconnect();
}
