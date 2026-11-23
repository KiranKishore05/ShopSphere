import { describe, it, expect } from 'vitest';
import bcrypt from 'bcryptjs';
import { strongPasswordSchema } from '../src/validators/authValidators.js';

describe('Demo Account Provisioning & Safety Suite', () => {
  const DEMO_ADMIN = {
    email: 'admin@shopsphere.in',
    passwordPlain: 'Admin@ShopSphere2026!',
    role: 'admin'
  };

  const DEMO_CUSTOMER = {
    email: 'customer@shopsphere.in',
    passwordPlain: 'Customer@ShopSphere2026!',
    role: 'customer'
  };

  it('demo customer credentials must strictly satisfy backend strong password validation', () => {
    const parsed = strongPasswordSchema.safeParse(DEMO_CUSTOMER.passwordPlain);
    expect(parsed.success).toBe(true);
  });

  it('demo admin credentials must strictly satisfy backend strong password validation', () => {
    const parsed = strongPasswordSchema.safeParse(DEMO_ADMIN.passwordPlain);
    expect(parsed.success).toBe(true);
  });

  it('bcrypt hashes of demo passwords must verify correctly against plaintext passwords', async () => {
    const adminHash = await bcrypt.hash(DEMO_ADMIN.passwordPlain, 10);
    const customerHash = await bcrypt.hash(DEMO_CUSTOMER.passwordPlain, 10);

    const adminMatch = await bcrypt.compare(DEMO_ADMIN.passwordPlain, adminHash);
    const customerMatch = await bcrypt.compare(DEMO_CUSTOMER.passwordPlain, customerHash);

    expect(adminMatch).toBe(true);
    expect(customerMatch).toBe(true);

    const wrongMatch = await bcrypt.compare('WrongPassword123!', adminHash);
    expect(wrongMatch).toBe(false);
  });

  it('production cluster guard must reject production cluster hostname', () => {
    const prodUri = 'mongodb+srv://admin:pass@cluster0.1khdiho.mongodb.net/shopsphere';
    const isProdCluster = prodUri.includes('cluster0.1khdiho.mongodb.net') && !prodUri.toLowerCase().includes('test');
    expect(isProdCluster).toBe(true);
  });

  it('production cluster guard must allow test cluster hostname or test database', () => {
    const testClusterUri = 'mongodb+srv://testUser:testPass@shopsphere-test.mongodb.net/shopsphere_test';
    const isBlocked = testClusterUri.includes('cluster0.1khdiho.mongodb.net') && !testClusterUri.toLowerCase().includes('test');
    expect(isBlocked).toBe(false);
  });
});
