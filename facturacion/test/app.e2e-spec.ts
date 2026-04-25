import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication<App>;

  const api = (path: string) => `/api/v1${path}`;
  const randomEmail = () => `user_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;

  beforeAll(() => {
    // Ajustes para que el e2e sea determinista
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.LOGIN_MAX_ATTEMPTS_EMAIL = process.env.LOGIN_MAX_ATTEMPTS_EMAIL || '5';
    process.env.LOGIN_MAX_ATTEMPTS_IP = process.env.LOGIN_MAX_ATTEMPTS_IP || '10';
    process.env.LOGIN_ATTEMPT_WINDOW_MS = process.env.LOGIN_ATTEMPT_WINDOW_MS || '60000';
    process.env.LOGIN_ATTEMPT_BLOCK_MS = process.env.LOGIN_ATTEMPT_BLOCK_MS || '60000';
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // En tests no corre main.ts, así que replicamos el prefijo global
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  it('GET /health (should be ok)', async () => {
    const res = await request(app.getHttpServer())
      .get(api('/health'))
      .expect(200);

    expect(res.body).toHaveProperty('status');
  });

  it('register -> login -> me -> update profile -> change password -> login new password', async () => {
    const email = randomEmail();
    const password = 'MyStrongP4ssword';
    const newPassword = 'NewStrongP4ssword1';

    // register
    const registerRes = await request(app.getHttpServer())
      .post(api('/auth/register'))
      .send({ email, password, fullName: 'Test User' })
      .expect(201);
    expect(registerRes.body).toHaveProperty('id');
    expect(registerRes.body.email).toBe(email);

    // login
    const loginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);
    expect(loginRes.body).toHaveProperty('accessToken');
    const token = loginRes.body.accessToken as string;

    // me
    const meRes = await request(app.getHttpServer())
      .get(api('/auth/me'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(meRes.body.email).toBe(email);

    // update profile
    const updatedRes = await request(app.getHttpServer())
      .patch(api('/users/me/profile'))
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Test User Updated' })
      .expect(200);
    expect(updatedRes.body.fullName).toBe('Test User Updated');

    // change password
    await request(app.getHttpServer())
      .patch(api('/users/me/password'))
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: password, newPassword })
      .expect(200);

    // login with new password
    const loginRes2 = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email, password: newPassword })
      .expect(200);
    expect(loginRes2.body).toHaveProperty('accessToken');
  });

  afterAll(async () => {
    await app.close();
  });
});
