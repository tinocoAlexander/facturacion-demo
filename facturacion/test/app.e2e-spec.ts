import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Pool } from 'pg';
import { AppModule } from './../src/app.module';
import { DATABASE_POOL } from './../src/database/database.constants';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let pool: Pool;

  const api = (path: string) => `/api/v1${path}`;
  const randomEmail = () =>
    `user_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const randomIp = () =>
    `10.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`;

  beforeAll(() => {
    // Ajustes para que el e2e sea determinista
    process.env.NODE_ENV = process.env.NODE_ENV || 'test';
    process.env.LOGIN_MAX_ATTEMPTS_EMAIL =
      process.env.LOGIN_MAX_ATTEMPTS_EMAIL || '5';
    process.env.LOGIN_MAX_ATTEMPTS_IP =
      process.env.LOGIN_MAX_ATTEMPTS_IP || '10';
    process.env.LOGIN_ATTEMPT_WINDOW_MS =
      process.env.LOGIN_ATTEMPT_WINDOW_MS || '60000';
    process.env.LOGIN_ATTEMPT_BLOCK_MS =
      process.env.LOGIN_ATTEMPT_BLOCK_MS || '60000';
  });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // En tests no corre main.ts, así que replicamos el prefijo global
    app.setGlobalPrefix('api/v1');
    // Determinismo para throttling por IP
    const httpInstance = app.getHttpAdapter().getInstance() as {
      set: (key: string, value: unknown) => void;
    };
    httpInstance.set('trust proxy', 1);
    await app.init();

    pool = app.get<Pool>(DATABASE_POOL);
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
    const registerBody = registerRes.body as { id: number; email: string };
    expect(registerRes.body).toHaveProperty('id');
    expect(registerBody.email).toBe(email);

    // login
    const loginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);
    const loginBody = loginRes.body as {
      accessToken: string;
      refreshToken: string;
    };
    expect(loginRes.body).toHaveProperty('accessToken');
    expect(loginRes.body).toHaveProperty('refreshToken');
    const token = loginBody.accessToken;

    // me
    const meRes = await request(app.getHttpServer())
      .get(api('/auth/me'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const meBody = meRes.body as { email: string };
    expect(meBody.email).toBe(email);

    // update profile
    const updatedRes = await request(app.getHttpServer())
      .patch(api('/users/me/profile'))
      .set('Authorization', `Bearer ${token}`)
      .send({ fullName: 'Test User Updated' })
      .expect(200);
    const updatedBody = updatedRes.body as { fullName: string };
    expect(updatedBody.fullName).toBe('Test User Updated');

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
    expect(loginRes2.body).toHaveProperty('refreshToken');
  });

  it('login -> refresh rotates token -> old refresh invalid -> logout revokes', async () => {
    const email = randomEmail();
    const password = 'MyStrongP4ssword';

    await request(app.getHttpServer())
      .post(api('/auth/register'))
      .send({ email, password, fullName: 'Refresh User' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);

    const loginBody = loginRes.body as { refreshToken: string };
    const refreshToken1 = loginBody.refreshToken;
    expect(typeof refreshToken1).toBe('string');

    const refreshRes = await request(app.getHttpServer())
      .post(api('/auth/refresh'))
      .send({ refreshToken: refreshToken1 })
      .expect(200);

    const refreshBody = refreshRes.body as {
      accessToken: string;
      refreshToken: string;
    };
    const refreshToken2 = refreshBody.refreshToken;
    expect(refreshRes.body).toHaveProperty('accessToken');
    expect(typeof refreshToken2).toBe('string');
    expect(refreshToken2).not.toBe(refreshToken1);

    // old token should be invalid after rotation
    await request(app.getHttpServer())
      .post(api('/auth/refresh'))
      .send({ refreshToken: refreshToken1 })
      .expect(401);

    // logout revokes current refresh
    await request(app.getHttpServer())
      .post(api('/auth/logout'))
      .send({ refreshToken: refreshToken2 })
      .expect(200);

    await request(app.getHttpServer())
      .post(api('/auth/refresh'))
      .send({ refreshToken: refreshToken2 })
      .expect(401);
  });

  it('admin RBAC: non-admin forbidden, admin can list/create users', async () => {
    // Non-admin user
    const email = randomEmail();
    const password = 'MyStrongP4ssword';
    await request(app.getHttpServer())
      .post(api('/auth/register'))
      .send({ email, password, fullName: 'Normal User' })
      .expect(201);
    const loginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email, password })
      .expect(200);
    const userLoginBody = loginRes.body as { accessToken: string };
    const userToken = userLoginBody.accessToken;

    await request(app.getHttpServer())
      .get(api('/users'))
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    await request(app.getHttpServer())
      .get(api('/audit/logs'))
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    // Admin user (promoted directly in DB)
    const adminEmail = randomEmail();
    await request(app.getHttpServer())
      .post(api('/auth/register'))
      .send({ email: adminEmail, password, fullName: 'Admin User' })
      .expect(201);

    await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
      adminEmail,
    ]);

    const adminLoginRes = await request(app.getHttpServer())
      .post(api('/auth/login'))
      .send({ email: adminEmail, password })
      .expect(200);
    const adminLoginBody = adminLoginRes.body as { accessToken: string };
    const adminToken = adminLoginBody.accessToken;

    const listRes = await request(app.getHttpServer())
      .get(api('/users?page=1&limit=10'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(listRes.body).toHaveProperty('data');

    const auditRes = await request(app.getHttpServer())
      .get(api('/audit/logs?page=1&limit=10'))
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const auditBody = auditRes.body as { data: unknown[] };
    expect(Array.isArray(auditBody.data)).toBe(true);
    expect(auditRes.body).toHaveProperty('meta');

    const newEmail = randomEmail();
    const createRes = await request(app.getHttpServer())
      .post(api('/users'))
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: newEmail,
        password: 'AnotherP4ssword1',
        fullName: 'Created By Admin',
      })
      .expect(201);
    const createBody = createRes.body as { email: string };
    expect(createBody.email).toBe(newEmail);
  });

  it('throttling: /auth/register returns 429 after limit', async () => {
    const ip = randomIp();

    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .set('X-Forwarded-For', ip)
        .send({
          email: randomEmail(),
          password: 'MyStrongP4ssword',
          fullName: 'Throttle User',
        })
        .expect(201);
    }

    await request(app.getHttpServer())
      .post(api('/auth/register'))
      .set('X-Forwarded-For', ip)
      .send({
        email: randomEmail(),
        password: 'MyStrongP4ssword',
        fullName: 'Throttle User 6',
      })
      .expect(429);
  });

  describe('EmpresasModule (e2e)', () => {
    const randomRfc = () => `TEST${String(Date.now()).slice(-6)}AAA`;
    const createEmpresaBody = (rfc: string) => ({
      rfc,
      nombre_comercial: 'Empresa Test',
      razon_social: 'Empresa Test S.A. de C.V.',
      regimen_fiscal: '601',
      codigo_postal: '34000',
      email_contacto: 'test@empresa.com',
    });

    let adminToken: string;
    let userToken: string;
    let userId: number;
    const ip = randomIp();

    beforeAll(async () => {
      // Create admin
      const adminEmail = randomEmail();
      const password = 'MyStrongP4ssword';
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .set('X-Forwarded-For', ip)
        .send({ email: adminEmail, password, fullName: 'Admin Empresa' })
        .expect(201);
      await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
        adminEmail,
      ]);
      const adminLoginRes = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .set('X-Forwarded-For', ip)
        .send({ email: adminEmail, password })
        .expect(200);
      adminToken = (adminLoginRes.body as { accessToken: string }).accessToken;

      // Create normal user
      const userEmail = randomEmail();
      const userRes = await request(app.getHttpServer())
        .post(api('/auth/register'))
        .set('X-Forwarded-For', ip)
        .send({ email: userEmail, password, fullName: 'User Empresa' })
        .expect(201);
      userId = (userRes.body as { id: number }).id;
      const userLoginRes = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .set('X-Forwarded-For', ip)
        .send({ email: userEmail, password })
        .expect(200);
      userToken = (userLoginRes.body as { accessToken: string }).accessToken;
    });

    it('admin puede crear empresa', async () => {
      const rfc = randomRfc();
      const res = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(rfc))
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect((res.body as { rfc: string }).rfc).toBe(rfc);
    });

    it('RFC duplicado devuelve 409 con código EMPRESAS_RFC_DUPLICADO', async () => {
      const rfc = randomRfc();
      await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(rfc))
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(rfc))
        .expect(409);
      expect((res.body as { code: string }).code).toBe(
        'EMPRESAS_RFC_DUPLICADO',
      );
    });

    it('RFC con formato inválido devuelve 400 con VALIDATION_ERROR', async () => {
      await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody('rfc123'))
        .expect(400);
    });

    it('usuario sin empresa_id obtiene TENANT_REQUIRED al llamar mi-empresa', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      expect((res.body as { code: string }).code).toBe('TENANT_REQUIRED');
    });

    it('usuario con empresa obtiene datos correctos en GET /empresas/mi-empresa', async () => {
      const rfc = randomRfc();
      const empresaRes = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(rfc))
        .expect(201);

      const empresaId = (empresaRes.body as { id: string }).id;

      // Assign user to empresa
      await request(app.getHttpServer())
        .post(api(`/empresas/${empresaId}/usuarios`))
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId })
        .expect(201);

      // Re-login to get new token with empresa_id
      const queryRes = await pool.query<{ email: string }>(
        'SELECT email FROM users WHERE id = $1',
        [userId],
      );
      const userEmail = queryRes.rows[0].email;
      const loginRes = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .set('X-Forwarded-For', ip)
        .send({ email: userEmail, password: 'MyStrongP4ssword' })
        .expect(200);
      const newToken = (loginRes.body as { accessToken: string }).accessToken;

      const miEmpresaRes = await request(app.getHttpServer())
        .get(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${newToken}`)
        .expect(200);
      const miEmpresaBody = miEmpresaRes.body as { id: string; rfc: string };
      expect(miEmpresaBody.id).toBe(empresaId);
      expect(miEmpresaBody.rfc).toBe(rfc);
    });

    it('admin puede listar todas las empresas con paginación', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/empresas?page=1&limit=10'))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body as { data: unknown[] };
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
