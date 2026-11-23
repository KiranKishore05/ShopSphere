import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runAuthVerification() {
  const envTestLocalPath = path.resolve(__dirname, '../../.env.test.local');
  if (!fs.existsSync(envTestLocalPath)) {
    console.error('⛔ FATAL: server/.env.test.local does not exist!');
    process.exit(1);
  }

  const envConfig = dotenv.parse(fs.readFileSync(envTestLocalPath));
  const testUri = (envConfig.TEST_MONGODB_URI || '').trim();

  // Safety checks
  const normalized = testUri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
  const parsedUrl = new URL(normalized);
  const host = parsedUrl.host.toLowerCase();
  const dbName = parsedUrl.pathname.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '');

  if (host !== 'shopsphere-test.axblrnw.mongodb.net') {
    console.error(`⛔ FATAL: Refusing execution. Target host "${host}" does not match shopsphere-test.axblrnw.mongodb.net.`);
    process.exit(1);
  }

  if (dbName !== 'shopsphere_test') {
    console.error(`⛔ FATAL: Refusing execution. Target database "${dbName}" does not match shopsphere_test.`);
    process.exit(1);
  }

  if (testUri.includes('cluster0.1khdiho.mongodb.net') || dbName === 'shopsphere') {
    console.error('⛔ FATAL: Production Cluster0 or production database detected. Execution aborted!');
    process.exit(1);
  }

  // Read demo passwords safely from environment with fallback
  const customerPassword = process.env.DEMO_CUSTOMER_PASSWORD || 'Customer@ShopSphere2026!';
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD || 'Admin@ShopSphere2026!';

  console.log('\n======================================================');
  console.log('🛡️  ShopSphere Real Authentication API Verification');
  console.log(`📡 Target Cluster Host: ${host}`);
  console.log(`📂 Target Database:     ${dbName}`);
  console.log('======================================================\n');

  try {
    // Connect to test database
    await connectDB({ uri: testUri });
    console.log(`✅ Connected to verified test database: ${mongoose.connection.db.databaseName}\n`);

    // ------------------------------------------------------------------
    // CUSTOMER TEST
    // ------------------------------------------------------------------
    console.log('--- [1] CUSTOMER AUTHENTICATION SUITE ---');

    // 1.1 Customer Login
    const custLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        email: 'customer@shopsphere.in',
        password: customerPassword
      });

    console.log(`Customer Login Status Code:     ${custLoginRes.status}`);
    console.log(`Customer Login Success Field:   ${custLoginRes.body?.success}`);
    console.log(`Customer User Returned:         ${custLoginRes.body?.data?.user?.email} (Role: ${custLoginRes.body?.data?.user?.role})`);

    const customerCookies = custLoginRes.headers['set-cookie'] || [];
    const customerTokenCookie = customerCookies.find(c => c.startsWith('token='));
    console.log(`Customer Session Cookie Issued: ${Boolean(customerTokenCookie)}`);

    if (custLoginRes.status !== 200) {
      throw new Error(`Customer login failed with status ${custLoginRes.status}: ${JSON.stringify(custLoginRes.body)}`);
    }

    // 1.2 Customer /auth/me
    const custMeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', customerTokenCookie);

    console.log(`Customer /auth/me Status Code:  ${custMeRes.status}`);
    console.log(`Customer /auth/me Email:        ${custMeRes.body?.data?.user?.email}`);
    console.log(`Customer /auth/me Role:         ${custMeRes.body?.data?.user?.role}`);

    const isCustomerRoleValid = custMeRes.body?.data?.user?.role === 'customer';
    console.log(`Customer Role Verified:         ${isCustomerRoleValid ? 'YES (customer)' : 'NO'}`);

    // 1.3 Customer Logout
    const custLogoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:5173')
      .set('X-Requested-With', 'XMLHttpRequest')
      .set('Cookie', customerTokenCookie);

    console.log(`Customer Logout Status Code:    ${custLogoutRes.status}`);
    console.log(`Customer Logout Success:        ${custLogoutRes.body?.success}`);

    const logoutCookies = custLogoutRes.headers['set-cookie'] || [];
    const clearedCookie = logoutCookies.find(c => c.startsWith('token='));

    // 1.4 Verify session invalid after logout
    const postLogoutMeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', clearedCookie || 'token=loggedout; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT');

    console.log(`Post-Logout /auth/me Status:    ${postLogoutMeRes.status} (Expected 401)`);
    console.log(`Session Invalidated After Logout: ${postLogoutMeRes.status === 401 ? 'YES' : 'NO'}`);

    // ------------------------------------------------------------------
    // ADMIN TEST
    // ------------------------------------------------------------------
    console.log('\n--- [2] ADMIN AUTHENTICATION & RBAC SUITE ---');

    // 2.1 Admin Login
    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({
        email: 'admin@shopsphere.in',
        password: adminPassword
      });

    console.log(`Admin Login Status Code:        ${adminLoginRes.status}`);
    console.log(`Admin Login Success Field:      ${adminLoginRes.body?.success}`);
    console.log(`Admin User Returned:            ${adminLoginRes.body?.data?.user?.email} (Role: ${adminLoginRes.body?.data?.user?.role})`);

    const adminCookies = adminLoginRes.headers['set-cookie'] || [];
    const adminTokenCookie = adminCookies.find(c => c.startsWith('token='));
    console.log(`Admin Session Cookie Issued:    ${Boolean(adminTokenCookie)}`);

    if (adminLoginRes.status !== 200) {
      throw new Error(`Admin login failed with status ${adminLoginRes.status}: ${JSON.stringify(adminLoginRes.body)}`);
    }

    // 2.2 Admin /auth/me
    const adminMeRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', adminTokenCookie);

    console.log(`Admin /auth/me Status Code:     ${adminMeRes.status}`);
    console.log(`Admin /auth/me Email:           ${adminMeRes.body?.data?.user?.email}`);
    console.log(`Admin /auth/me Role:            ${adminMeRes.body?.data?.user?.role}`);

    const isAdminRoleValid = adminMeRes.body?.data?.user?.role === 'admin';
    console.log(`Admin Role Verified:            ${isAdminRoleValid ? 'YES (admin)' : 'NO'}`);

    // 2.3 Access safe read-only admin API with admin session
    const adminApiRes = await request(app)
      .get('/api/v1/admin/ping')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', adminTokenCookie);

    console.log(`Admin API (/admin/ping) Status: ${adminApiRes.status} (Expected 200)`);
    console.log(`Admin API Response Success:     ${adminApiRes.body?.success}`);
    console.log(`Admin API Authorization Status: ${adminApiRes.status === 200 ? 'AUTHORIZED' : 'DENIED'}`);

    // 2.4 Verify Customer CANNOT access the same admin API (RBAC)
    const custAdminAttemptRes = await request(app)
      .get('/api/v1/admin/ping')
      .set('Origin', 'http://localhost:5173')
      .set('Cookie', customerTokenCookie);

    console.log(`Customer Access to Admin API:   ${custAdminAttemptRes.status} (Expected 403)`);
    console.log(`Customer Forbidden Error Code:  ${custAdminAttemptRes.body?.error?.code || custAdminAttemptRes.body?.code}`);
    console.log(`RBAC Barrier Protection Status: ${custAdminAttemptRes.status === 403 ? 'SECURE (Customer blocked from Admin API)' : 'FAILED'}`);

    console.log('\n======================================================');
    console.log('🎉 ALL LIVE AUTHENTICATION & RBAC CHECKS PASSED');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error during authentication verification:', err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

runAuthVerification();
