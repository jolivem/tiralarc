import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureApp } from '../src/setup.js';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  const credentials = { email: 'Jane@Example.com', password: 'correct horse battery' };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const prisma = app.get(PrismaService);
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health is public', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    expect(res.body.status).toBe('ok');
  });

  it('rejects invalid payloads with problem+json', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['email', 'password']);
  });

  it('register → me → refresh (rotation) → reuse detection → logout', async () => {
    const http = request(app.getHttpServer());

    const registered = await http
      .post('/api/v1/auth/register')
      .send({ ...credentials, displayName: 'Jane', deviceName: 'e2e' })
      .expect(201);
    expect(registered.body.tokenType).toBe('Bearer');

    await http.post('/api/v1/auth/register').send(credentials).expect(409);

    await http.get('/api/v1/users/me').expect(401);
    const me = await http
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({ email: 'jane@example.com', displayName: 'Jane' });
    expect(me.body.passwordHash).toBeUndefined();

    const login = await http
      .post('/api/v1/auth/login')
      .send({ email: 'jane@example.com', password: credentials.password })
      .expect(200);
    await http
      .post('/api/v1/auth/login')
      .send({ ...credentials, password: 'wrong password' })
      .expect(401);

    const refreshed = await http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(200);
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);

    // Replaying the rotated token revokes the whole session…
    await http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: login.body.refreshToken })
      .expect(401);
    await http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: refreshed.body.refreshToken })
      .expect(401);

    // …but not the other session (the one opened at registration).
    await http
      .post('/api/v1/auth/logout')
      .send({ refreshToken: registered.body.refreshToken })
      .expect(204);
    await http
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.body.refreshToken })
      .expect(401);
  });
});
