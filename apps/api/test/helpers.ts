import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { type ExternalIdentity, IdTokenVerifier } from '../src/auth/id-token-verifier.service.js';
import { ApiException, ErrorCode } from '../src/common/errors.js';
import type { FftaCompetition, FftaCompetitionDetails } from '../src/competitions/ffta-parser.js';
import { FftaClient, type FftaSearch } from '../src/competitions/ffta.client.js';
import type { FftaRankingInfo, FftaRankingRow } from '../src/competitions/ffta-rankings.js';
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

/** Stand-in for the FFTA website: answers each search from `results`, by "<dep ids>:<discipline>". */
export class FakeFfta {
  readonly results = new Map<string, FftaCompetition[]>();
  readonly searches: FftaSearch[] = [];
  /** Searches that fail (the site unreachable), same keys. */
  readonly failing = new Set<string>();
  /** The place on each competition's page, by id (none: the page can't be read). */
  readonly places = new Map<string, string | null>();
  /** National rankings: the season, each discipline code's list, archers' rows by "<id>:<licence>". */
  rankingSeasonValue: string | null = '2027';
  readonly rankingLists = new Map<string, FftaRankingInfo[]>();
  readonly rankingRows = new Map<string, FftaRankingRow>();
  readonly rankingReads: string[] = [];
  async rankingSeason(): Promise<string | null> {
    return this.rankingSeasonValue;
  }
  async rankingList(season: string, discipline: string): Promise<FftaRankingInfo[]> {
    return this.rankingLists.get(`${season}:${discipline}`) ?? [];
  }
  async rankingRow(id: string, licence: string): Promise<FftaRankingRow | null> {
    this.rankingReads.push(id);
    return this.rankingRows.get(`${id}:${licence}`) ?? null;
  }
  /** The results each competition's page links to, by id. */
  readonly resultUrls = new Map<string, string>();
  async details(id: string): Promise<FftaCompetitionDetails> {
    if (!this.places.has(id)) throw new Error('HTTP 403');
    return { place: this.places.get(id)!, resultsUrl: this.resultUrls.get(id) ?? null };
  }
  async search(search: FftaSearch): Promise<FftaCompetition[]> {
    this.searches.push(search);
    const key = `${search.departmentIds.join(',')}:${search.discipline}`;
    if (this.failing.has(key)) throw new Error('HTTP 403');
    return this.results.get(key) ?? [];
  }
}

export interface TestContext {
  app: INestApplication<App>;
  prisma: PrismaService;
  /** Every email "sent" by the app. */
  outbox: OutgoingMail[];
  /** Every file "stored" by the app, by key. */
  files: Map<string, Buffer>;
  ffta: FakeFfta;
}

export async function createTestApp(): Promise<TestContext> {
  const outbox: OutgoingMail[] = [];
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(IdTokenVerifier)
    .useClass(FakeIdTokenVerifier)
    .overrideProvider(StorageService)
    .useClass(FakeStorage)
    .overrideProvider(FftaClient)
    .useClass(FakeFfta)
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
  return { app, prisma, outbox, files, ffta: app.get<FakeFfta>(FftaClient) };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  // Child tables cascade from users.
  await prisma.user.deleteMany();
}

/**
 * Takes the stored roles (ARCHER) away from an account: every new account is an archer, so this
 * is how tests get someone who isn't (sign in again for a token without them).
 */
export async function dropRoles(prisma: PrismaService, email: string): Promise<void> {
  await prisma.userRole.deleteMany({ where: { user: { email } } });
}

/** Extracts the verification token from the last email sent to `to`. */
export function verificationTokenFor(outbox: OutgoingMail[], to: string): string {
  const mail = outbox.filter((m) => m.to === to).at(-1);
  const token = mail?.text.match(/[?&]token=([\w-]+)/)?.[1];
  if (!token) throw new Error(`No verification email for ${to}`);
  return token;
}

export { AuthProvider };
