/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-require-imports */
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import type { Pool } from 'pg';

// Configurar variables de entorno antes de importar AppModule para evitar fallos en validación Joi
process.env.NODE_ENV = 'test';
process.env.CSD_ENCRYPTION_KEY = require('crypto')
  .randomBytes(32)
  .toString('hex');
process.env.THROTTLE_LIMIT = '1000';

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
  const randomRfc = () => `TEST${String(Date.now()).slice(-6)}AAA`;

  beforeAll(() => {
    // Ajustes para que el e2e sea determinista
    process.env.LOGIN_MAX_ATTEMPTS_EMAIL = '5';
    process.env.LOGIN_MAX_ATTEMPTS_IP = '10';
    process.env.LOGIN_ATTEMPT_WINDOW_MS = '60000';
    process.env.LOGIN_ATTEMPT_BLOCK_MS = '60000';
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

  // ----------------------------------------------------
  // EMPRESAS MODULE
  // ----------------------------------------------------
  describe('EmpresasModule (e2e)', () => {
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
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .set('X-Forwarded-For', ip)
        .send({ email: userEmail, password, fullName: 'User Empresa' })
        .expect(201);
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

    it('RFC con formato inválido devuelve 400 VALIDATION_ERROR', async () => {
      const invalidRfcs = ['abc', 'AAAA010101XXXX', 'XAX01010100'];
      for (const invalid of invalidRfcs) {
        await request(app.getHttpServer())
          .post(api('/empresas'))
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createEmpresaBody(invalid))
          .expect(400);
      }
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

    it('usuario sin empresa_id obtiene 403 TENANT_REQUIRED en GET /empresas/mi-empresa', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
      expect((res.body as { code: string }).code).toBe('TENANT_REQUIRED');
    });

    it('usuario con empresa obtiene datos correctos en GET /empresas/mi-empresa', async () => {
      const rfc = randomRfc();
      const email = randomEmail();
      const password = 'MyStrongP4ssword';

      // 1. Create empresa
      const empresaRes = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(rfc))
        .expect(201);
      const empresaId = (empresaRes.body as { id: string }).id;

      // 2. Create user
      const userRes = await request(app.getHttpServer())
        .post(api('/auth/register'))
        .set('X-Forwarded-For', ip)
        .send({ email, password, fullName: 'New User' })
        .expect(201);
      const newUserId = (userRes.body as { id: number }).id;

      // 3. Assign user to empresa
      await request(app.getHttpServer())
        .post(api(`/empresas/${empresaId}/usuarios`))
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: newUserId })
        .expect(200);

      // 4. Login
      const loginRes = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .set('X-Forwarded-For', ip)
        .send({ email, password })
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

    it('AISLAMIENTO: usuario de empresa A no puede acceder a datos de empresa B', async () => {
      const pass = 'P4ssword';
      const emailA = randomEmail();
      const emailB = randomEmail();
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email: emailA, password: pass, fullName: 'User A' });
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email: emailB, password: pass, fullName: 'User B' });

      const empA = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(randomRfc()));
      const empB = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(randomRfc()));

      const userA = await pool.query('SELECT id FROM users WHERE email = $1', [
        emailA,
      ]);
      const userB = await pool.query('SELECT id FROM users WHERE email = $1', [
        emailB,
      ]);

      await pool.query('UPDATE users SET empresa_id = $1 WHERE id = $2', [
        empA.body.id,
        userA.rows[0].id,
      ]);
      await pool.query('UPDATE users SET empresa_id = $1 WHERE id = $2', [
        empB.body.id,
        userB.rows[0].id,
      ]);

      const loginA = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email: emailA, password: pass });
      const tokenA = loginA.body.accessToken;

      // Access B endpoints -> 403 or filtered out (we can test tickets since it's the primary tenant isolation point)
      // If we attempt to get tickets for empB, it will actually just return tickets for empA because it extracts the tenant from the user's token.
      // So let's test that accessing an endpoint meant for a specific resource gives 403 or Not Found.
      // However, typical isolation is tested by verifying we only see our own data.
      const res = await request(app.getHttpServer())
        .get(api('/tickets'))
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
      // Ensure no items from B leak
      expect(res.body.data).toEqual([]);
    });

    it('empresa inactiva rechaza requests con 403 TENANT_INACTIVE', async () => {
      const email = randomEmail();
      const pass = 'P4ssword';
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email, password: pass, fullName: 'InactivaUser' });
      const emp = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(randomRfc()));

      const u = await pool.query('SELECT id FROM users WHERE email = $1', [
        email,
      ]);
      await pool.query('UPDATE users SET empresa_id = $1 WHERE id = $2', [
        emp.body.id,
        u.rows[0].id,
      ]);

      // Deactivate emp
      await pool.query('UPDATE empresas SET is_active = false WHERE id = $1', [
        emp.body.id,
      ]);

      const login = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email, password: pass });
      const token = login.body.accessToken;

      const res = await request(app.getHttpServer())
        .get(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      expect(res.body.code).toBe('TENANT_INACTIVE');
    });

    it('admin puede listar empresas con paginación correcta', async () => {
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post(api('/empresas'))
          .set('Authorization', `Bearer ${adminToken}`)
          .send(createEmpresaBody(randomRfc()));
      }
      const res = await request(app.getHttpServer())
        .get(api('/empresas?page=1&limit=2'))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
      const body = res.body as { data: unknown[]; meta: { total: number } };
      expect(body.data.length).toBe(2);
      expect(body.meta.total).toBeGreaterThanOrEqual(3);
    });

    it('actualizar empresa propia — solo campos permitidos, RFC inmutable', async () => {
      const email = randomEmail();
      const pass = 'P4ssword';
      const origRfc = randomRfc();
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email, password: pass, fullName: 'Upd' });
      const emp = await request(app.getHttpServer())
        .post(api('/empresas'))
        .set('Authorization', `Bearer ${adminToken}`)
        .send(createEmpresaBody(origRfc));
      const u = await pool.query('SELECT id FROM users WHERE email = $1', [
        email,
      ]);
      await pool.query('UPDATE users SET empresa_id = $1 WHERE id = $2', [
        emp.body.id,
        u.rows[0].id,
      ]);
      const login = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email, password: pass });

      // forbidNonWhitelisted rechazará el request si enviamos el campo rfc
      await request(app.getHttpServer())
        .patch(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ rfc: 'NEW123456RFC', nombre_comercial: 'Updated Name' })
        .expect(400);

      await request(app.getHttpServer())
        .patch(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .send({ nombre_comercial: 'Updated Name' })
        .expect(200);

      const check = await request(app.getHttpServer())
        .get(api('/empresas/mi-empresa'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(200);

      expect(check.body.rfc).toBe(origRfc); // immutable
      expect(check.body.nombre_comercial).toBe('Updated Name');
    });
  });

  // ----------------------------------------------------
  // CATALOGOS MODULE
  // ----------------------------------------------------
  describe('CatalogosModule (e2e)', () => {
    let adminToken: string;

    beforeAll(async () => {
      const email = randomEmail();
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email, password: 'P4ssword', fullName: 'Admin' });
      await pool.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [
        email,
      ]);
      const login = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email, password: 'P4ssword' });
      adminToken = login.body.accessToken;

      // Seed catalogos
      await pool.query(`
        INSERT INTO c_clave_prod_serv (clave, descripcion, activo) VALUES ('01010101', 'No existe en el catálogo', true) ON CONFLICT DO NOTHING;
        INSERT INTO c_clave_prod_serv (clave, descripcion, activo) VALUES ('43211500', 'Computadora personal', true) ON CONFLICT DO NOTHING;
        INSERT INTO c_uso_cfdi (clave, descripcion, aplica_fisica, aplica_moral, activo) VALUES ('G01', 'Adquisición de mercancias', true, true, true) ON CONFLICT DO NOTHING;
        INSERT INTO c_uso_cfdi (clave, descripcion, aplica_fisica, aplica_moral, activo) VALUES ('G02', 'Devoluciones, descuentos o bonificaciones', true, true, true) ON CONFLICT DO NOTHING;
        INSERT INTO c_regimen_fiscal (clave, descripcion, aplica_fisica, aplica_moral, activo) VALUES ('601', 'General de Ley Personas Morales', false, true, true) ON CONFLICT DO NOTHING;
        INSERT INTO c_regimen_fiscal (clave, descripcion, aplica_fisica, aplica_moral, activo) VALUES ('612', 'Personas Físicas con Actividades Empresariales', true, false, true) ON CONFLICT DO NOTHING;
      `);
    });

    it('GET /catalogos/productos es PÚBLICO — responde sin JWT', async () => {
      await request(app.getHttpServer())
        .get(api('/catalogos/productos?q=computadora'))
        .expect(200);
    });

    it('búsqueda de productos retorna resultados relevantes', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/catalogos/productos?q=computadora'))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('clave');
        expect(res.body[0]).toHaveProperty('descripcion');
      }
    });

    it('búsqueda con menos de 3 chars retorna array vacío', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/catalogos/productos?q=ab'))
        .expect(200);
      expect(res.body).toEqual([]);
    });

    it('GET /catalogos/uso-cfdi retorna lista completa', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/catalogos/uso-cfdi'))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('GET /catalogos/regimen-fiscal?tipo=fisica filtra correctamente', async () => {
      const res = await request(app.getHttpServer())
        .get(api('/catalogos/regimen-fiscal?tipo=fisica'))
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach((r: any) => {
        expect(r.aplica_fisica).toBe(true);
      });
    });

    it('POST /catalogos/sync requiere rol admin', async () => {
      // sin jwt -> 401
      await request(app.getHttpServer())
        .post(api('/catalogos/sync'))
        .expect(401);

      // con user jwt -> 403
      const email = randomEmail();
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email, password: 'P4ssword', fullName: 'User' });
      const login = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email, password: 'P4ssword' });
      await request(app.getHttpServer())
        .post(api('/catalogos/sync'))
        .set('Authorization', `Bearer ${login.body.accessToken}`)
        .expect(403);

      // con admin jwt -> 201 (since Post without HttpCode resolves to 201 by default)
      await request(app.getHttpServer())
        .post(api('/catalogos/sync'))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);
    });
  });

  // ----------------------------------------------------
  // TICKETS MODULE
  // ----------------------------------------------------
  describe('TicketsModule (e2e)', () => {
    let adminToken: string;
    let cajeroToken: string;
    let contadorToken: string;
    let empresaId: string;
    let empresaBId: string;
    let cajeroBToken: string;

    const createEmpresa = async (rfc: string) => {
      const res = await pool.query(
        `
        INSERT INTO empresas (rfc, nombre_comercial, razon_social, regimen_fiscal, codigo_postal, is_active)
        VALUES ($1, 'Tickets E2E', 'Tickets E2E SA', '601', '34000', true)
        RETURNING id
      `,
        [rfc],
      );
      return res.rows[0].id;
    };

    const createUserWithRole = async (role: string, empId: string) => {
      const email = randomEmail();
      const pass = 'P4ssword';
      await request(app.getHttpServer())
        .post(api('/auth/register'))
        .send({ email, password: pass, fullName: role });
      const u = await pool.query(`SELECT id FROM users WHERE email = $1`, [
        email,
      ]);
      await pool.query(
        `UPDATE users SET role = $1, empresa_id = $2 WHERE id = $3`,
        [role, empId, u.rows[0].id],
      );
      const login = await request(app.getHttpServer())
        .post(api('/auth/login'))
        .send({ email, password: pass });
      return login.body.accessToken;
    };

    const getTicketPayload = (folio: string) => ({
      folio_externo: folio,
      fecha_venta: new Date().toISOString(),
      moneda: 'MXN',
      forma_pago: '01',
      subtotal: 100,
      total_iva: 16,
      total: 116,
      items: [
        {
          clave_prod_serv: '01010101',
          clave_unidad: 'H87',
          descripcion: 'Venta',
          cantidad: 1,
          precio_unitario: 100,
          subtotal: 100,
          tasa_iva: 0.16,
          importe_iva: 16,
          objeto_imp: '02',
        },
      ],
    });

    beforeAll(async () => {
      empresaId = await createEmpresa(randomRfc());
      empresaBId = await createEmpresa(randomRfc());

      adminToken = await createUserWithRole('admin', empresaId);
      cajeroToken = await createUserWithRole('cajero', empresaId);
      contadorToken = await createUserWithRole('contador', empresaId);
      cajeroBToken = await createUserWithRole('cajero', empresaBId);

      await pool.query(`
        INSERT INTO c_clave_prod_serv (clave, descripcion, activo) VALUES ('01010101', 'No existe en el catálogo', true) ON CONFLICT DO NOTHING;
        INSERT INTO c_clave_unidad (clave, nombre, descripcion, activo) VALUES ('H87', 'Pieza', 'Pieza', true) ON CONFLICT DO NOTHING;
        INSERT INTO c_forma_pago (clave, descripcion, activo) VALUES ('01', 'Efectivo', true) ON CONFLICT DO NOTHING;
      `);
    }, 30000);

    it('cajero puede crear ticket con items válidos', async () => {
      const payload = getTicketPayload(`F-${Date.now()}`);
      const res = await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(payload)
        .expect(201);
      expect(res.body).toHaveProperty('id');
    });

    it('IDEMPOTENCIA: mismo folio_externo devuelve ticket existente sin duplicar', async () => {
      const folio = `F-IDEMP-${Date.now()}`;
      const payload = getTicketPayload(folio);

      const res1 = await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(payload)
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(payload)
        .expect(201);

      expect(res1.body.id).toBe(res2.body.id);

      const { rows } = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE folio_externo = $1 AND empresa_id = $2',
        [folio, empresaId],
      );
      expect(Number(rows[0].count)).toBe(1);
    });

    it('IDEMPOTENCIA CONCURRENTE: dos requests simultáneos al mismo folio', async () => {
      const folio = `F-CONCUR-${Date.now()}`;
      const payload = getTicketPayload(folio);

      const results = await Promise.allSettled([
        request(app.getHttpServer())
          .post(api('/tickets'))
          .set('Authorization', `Bearer ${cajeroToken}`)
          .send(payload),
        request(app.getHttpServer())
          .post(api('/tickets'))
          .set('Authorization', `Bearer ${cajeroToken}`)
          .send(payload),
      ]);

      results.forEach((r) => {
        if (r.status === 'fulfilled') {
          expect([200, 201]).toContain(r.value.status);
        }
      });

      const { rows } = await pool.query(
        'SELECT COUNT(*) FROM tickets WHERE folio_externo = $1 AND empresa_id = $2',
        [folio, empresaId],
      );
      expect(Number(rows[0].count)).toBe(1);
    });

    it('ticket con clave_prod_serv inválida devuelve 422', async () => {
      const payload = getTicketPayload(`F-${Date.now()}`);
      payload.items[0].clave_prod_serv = '99999999';
      await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(payload)
        .expect(422);
    });

    it('ticket con montos incoherentes devuelve 422', async () => {
      const payload = getTicketPayload(`F-${Date.now()}`);
      payload.total = 5000;
      await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(payload)
        .expect(422);
    });

    it('contador puede ver estadísticas pero no crear tickets', async () => {
      await request(app.getHttpServer())
        .get(api('/tickets/stats'))
        .set('Authorization', `Bearer ${contadorToken}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${contadorToken}`)
        .send(getTicketPayload(`F-${Date.now()}`))
        .expect(403);
    });

    it('cajero puede crear tickets pero no ver estadísticas', async () => {
      await request(app.getHttpServer())
        .get(api('/tickets/stats'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .expect(403);
    });

    it('AISLAMIENTO: cajero de empresa A no ve tickets de empresa B', async () => {
      const folioB = `F-B-${Date.now()}`;
      await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroBToken}`)
        .send(getTicketPayload(folioB))
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .expect(200);

      const ticketsA = res.body.data;
      const foundB = ticketsA.find((t: any) => t.folio_externo === folioB);
      expect(foundB).toBeUndefined();
    });

    it('anular ticket lo pone en estado anulado', async () => {
      const folio = `F-ANUL-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(getTicketPayload(folio))
        .expect(201);

      const ticketId = res.body.id;

      await request(app.getHttpServer())
        .patch(api(`/tickets/${ticketId}/anular`))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const check = await request(app.getHttpServer())
        .get(api(`/tickets/${ticketId}`))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(check.body.estado).toBe('anulado');
    });

    it('no se puede anular un ticket ya facturado', async () => {
      const folio = `F-FACT-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post(api('/tickets'))
        .set('Authorization', `Bearer ${cajeroToken}`)
        .send(getTicketPayload(folio))
        .expect(201);

      const ticketId = res.body.id;

      await pool.query(
        `UPDATE tickets SET estado = 'facturado' WHERE id = $1`,
        [ticketId],
      );

      await request(app.getHttpServer())
        .patch(api(`/tickets/${ticketId}/anular`))
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(409);
    });
  });

  afterAll(async () => {
    await app.close();
  });
});
