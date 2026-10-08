import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { type ExternalIdentity, IdTokenVerifier } from '../src/auth/id-token-verifier.service.js';
import { ApiException, ErrorCode } from '../src/common/errors.js';
import { AuthProvider } from '../src/generated/prisma/client.js';
import { MailService, type OutgoingMail } from '../src/mail/mail.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { StorageService } from '../src/storage/storage.service.js';
import { configureApp } from '../src/setup.js';

/**
 * Fake ID tokens: "<sub>|<email>|<emailVerified>|<name>". Real signature checks
 * need Google / Apple keys; the verifier's wiring is what e2e tests exercise.
 */
export function fakeIdToken(sub: string, email: string, verified = true, name = ''): string {
  return [sub, email, verified, name].join('|');
}

class FakeIdTokenVerifier {
  isEnabled() {
    return true;
  }
  async verify(provider: AuthProvider, idToken: string): Promise<ExternalIdentity> {
    const [subject, email, verified, name] = idToken.split('|');
    if (!subject || subject === 'invalid') {
      throw new ApiException(401, ErrorCode.INVALID_ID_TOKEN, 'Invalid ID token');
    }
    return {
      provider,
      subject,
      email,
      emailVerified: verified === 'true',
      name: name || undefined,
    };
  }
}

/** In-memory stand-in for the object storage: e2e tests need no S3 service. */
class FakeStorage {
  readonly files = new Map<string, Buffer>();
  async put(key: string, body: Buffer) {
    this.files.set(key, body);
  }
  async remove(keys: string[]) {
    for (const key of keys) this.files.delete(key);
  }
  async signedUrl(key: string) {
    return `https://storage.test/${key}?signature=fake`;
  }
}

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  /** Every email "sent" by the app. */
  outbox: OutgoingMail[];
  /** Every file "stored" by the app, by key. */
  files: Map<string, Buffer>;
}

export async function createTestApp(): Promise<TestContext> {
  const outbox: OutgoingMail[] = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IdTokenVerifier)
    .useClass(FakeIdTokenVerifier)
    .overrideProvider(StorageService)
    .useClass(FakeStorage)
    .compile();

  const app = moduleRef.createNestApplication<INestApplication<App>>();
  configureApp(app);
  const mail = app.get(MailService);
  mail.send = async (message: OutgoingMail) => {
    outbox.push(message);
  };
  await app.init();

  const prisma = app.get(PrismaService);
  await resetDatabase(prisma);
  const { files } = app.get<FakeStorage>(StorageService);
  return { app, prisma, outbox, files };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // Child tables cascade from users.
  await prisma.user.deleteMany();
}

/** Extracts the verification token from the last email sent to `to`. */
export function verificationTokenFor(outbox: OutgoingMail[], to: string): string {
  const mail = outbox.filter((m) => m.to === to).at(-1);
  const token = mail?.text.match(/[?&]token=([\w-]+)/)?.[1];
  if (!token) throw new Error(`No verification email for ${to}`);
  return token;
}

export { AuthProvider };
