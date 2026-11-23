import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { generateToken } from '../src/utils/token.js';
import { connectTestDB, disconnectTestDB } from './helpers/testDb.js';

describe('Customer Address Book API (/api/v1/users/me/addresses)', () => {
  let isDbConnected = false;
  let customerUser;
  let customerCookie;
  let otherCustomerUser;
  let otherCustomerCookie;

  beforeAll(async () => {
    const connResult = await connectTestDB();
    isDbConnected = connResult.connected;
    if (!isDbConnected) {
      return;
    }

    await User.deleteMany({ email: /@test-address\.com$/ });

    customerUser = await User.create({
      name: 'Eleanor Vance',
      email: 'eleanor@test-address.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const token = generateToken({ id: customerUser._id, email: customerUser.email, role: customerUser.role });
    customerCookie = `token=${token}`;

    otherCustomerUser = await User.create({
      name: 'Oliver Vance',
      email: 'oliver@test-address.com',
      passwordHash: await User.hashPassword('Password123!'),
      role: 'customer'
    });
    const otherToken = generateToken({ id: otherCustomerUser._id, email: otherCustomerUser.email, role: otherCustomerUser.role });
    otherCustomerCookie = `token=${otherToken}`;
  });

  beforeEach((ctx) => {
    if (mongoose.connection.readyState !== 1 || !isDbConnected) {
      ctx.skip();
    }
  });

  afterAll(async () => {
    try {
      if (isDbConnected && mongoose.connection.readyState === 1) {
        await User.deleteMany({ email: /@test-address\.com$/ });
      }
    } finally {
      await disconnectTestDB();
    }
  });

  let address1Id;
  let address2Id;

  describe('Authentication & Initial State', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/users/me/addresses');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return empty address list for new customer', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.addresses).toEqual([]);
    });
  });

  describe('POST /api/v1/users/me/addresses (Creation & Default Handling)', () => {
    it('should reject address creation if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie)
        .send({
          fullName: 'Eleanor Vance'
          // Missing phone, streetAddress, city, state, postalCode
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should automatically set first added address as default: true', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie)
        .send({
          fullName: 'Eleanor Vance',
          phone: '+919876543210',
          streetAddress: '42 Marine Drive, Nariman Point',
          apartment: 'Suite 804',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400021',
          country: 'India',
          isDefault: false // Even if false, first address must become default
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.address.isDefault).toBe(true);
      address1Id = res.body.data.address._id;
    });

    it('should demote existing default when a second address is added with isDefault: true', async () => {
      const res = await request(app)
        .post('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie)
        .send({
          fullName: 'Eleanor Vance Work',
          phone: '+919876543210',
          streetAddress: 'Bandrakurla Complex, Tower B',
          apartment: 'Level 12',
          city: 'Mumbai',
          state: 'Maharashtra',
          postalCode: '400051',
          country: 'India',
          isDefault: true
        });

      expect(res.status).toBe(201);
      expect(res.body.data.address.isDefault).toBe(true);
      address2Id = res.body.data.address._id;

      // Verify the list shows exactly 1 default address
      const listRes = await request(app)
        .get('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie);

      const addresses = listRes.body.data.addresses;
      expect(addresses).toHaveLength(2);

      const oldAddr = addresses.find(a => a._id === address1Id);
      const newAddr = addresses.find(a => a._id === address2Id);

      expect(oldAddr.isDefault).toBe(false);
      expect(newAddr.isDefault).toBe(true);
    });
  });

  describe('PATCH /api/v1/users/me/addresses/:addressId (Update & Default Switching)', () => {
    it('should update address details and switch default status back', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/me/addresses/${address1Id}`)
        .set('Cookie', customerCookie)
        .send({
          apartment: 'Penthouse 901',
          isDefault: true
        });

      expect(res.status).toBe(200);
      expect(res.body.data.address.apartment).toBe('Penthouse 901');
      expect(res.body.data.address.isDefault).toBe(true);

      // Verify address 2 is no longer default
      const listRes = await request(app)
        .get('/api/v1/users/me/addresses')
        .set('Cookie', customerCookie);

      const addr2 = listRes.body.data.addresses.find(a => a._id === address2Id);
      expect(addr2.isDefault).toBe(false);
    });

    it('should return 404 when updating non-existent address ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/v1/users/me/addresses/${fakeId}`)
        .set('Cookie', customerCookie)
        .send({ city: 'Pune' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');
    });
  });

  describe('DELETE /api/v1/users/me/addresses/:addressId', () => {
    it('should delete default address and automatically promote remaining address to default', async () => {
      // Currently address1 is default, address2 is not default
      const deleteRes = await request(app)
        .delete(`/api/v1/users/me/addresses/${address1Id}`)
        .set('Cookie', customerCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.data.addresses).toHaveLength(1);
      expect(deleteRes.body.data.addresses[0]._id).toBe(address2Id);
      expect(deleteRes.body.data.addresses[0].isDefault).toBe(true); // Promoted to default!
    });
  });

  describe('Ownership & Isolation Guards', () => {
    it('should not allow Customer B to see or delete Customer A addresses', async () => {
      // Customer B attempts to delete Customer A address
      const res = await request(app)
        .delete(`/api/v1/users/me/addresses/${address2Id}`)
        .set('Cookie', otherCustomerCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ADDRESS_NOT_FOUND');

      // Customer B's address list remains empty
      const listRes = await request(app)
        .get('/api/v1/users/me/addresses')
        .set('Cookie', otherCustomerCookie);

      expect(listRes.body.data.addresses).toHaveLength(0);
    });
  });
});
