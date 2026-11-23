import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';
import { connectDB, disconnectDB, maskMongoUri } from '../config/database.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';

/**
 * ShopSphere Demo Account & Test Data Bootstrap Script
 *
 * CRITICAL SAFETY CHECKS:
 * - Strictly prohibits execution against the production Cluster0 database.
 * - Non-destructive and idempotent: uses upserts; never drops collections or deletes existing records.
 * - Creates/synchronizes demo Admin and Customer accounts with strong credentials.
 */

export const DEMO_ADMIN_PASSWORD = process.env.DEMO_ADMIN_PASSWORD || 'Admin@ShopSphere2026!';
export const DEMO_CUSTOMER_PASSWORD = process.env.DEMO_CUSTOMER_PASSWORD || 'Customer@ShopSphere2026!';

const DEMO_ADMIN = {
  name: 'ShopSphere Admin',
  email: 'admin@shopsphere.in',
  passwordPlain: DEMO_ADMIN_PASSWORD,
  role: 'admin',
  phone: '+919876543210',
  isActive: true
};

const DEMO_CUSTOMER = {
  name: 'Ananya Sharma',
  email: 'customer@shopsphere.in',
  passwordPlain: DEMO_CUSTOMER_PASSWORD,
  role: 'customer',
  phone: '+919876543211',
  isActive: true,
  savedAddresses: [
    {
      isDefault: true,
      fullName: 'Ananya Sharma',
      phone: '+919876543211',
      streetAddress: 'Flat 402, Lotus Grandeur, Linking Road',
      apartment: 'Opposite National Park',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400050',
      country: 'India'
    }
  ]
};

const bootstrapDemo = async () => {
  const targetUri = process.env.TEST_MONGODB_URI || '';
  const maskedUri = maskMongoUri(targetUri);

  // 1. Production safety verification
  if (config.NODE_ENV === 'production' || process.env.NODE_ENV === 'production') {
    console.error('⛔ FATAL: Cannot run demo bootstrap in NODE_ENV=production!');
    process.exit(1);
  }

  if (!targetUri) {
    console.error('⛔ FATAL: TEST_MONGODB_URI is not set. Execution halted.');
    process.exit(1);
  }

  // Parse host and database name
  let host = '';
  let dbName = '';
  try {
    const normalized = targetUri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
    const parsed = new URL(normalized);
    host = parsed.host.toLowerCase();
    dbName = parsed.pathname.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '');
  } catch (err) {
    console.error('⛔ FATAL: Invalid TEST_MONGODB_URI syntax:', err.message);
    process.exit(1);
  }

  if (host !== 'shopsphere-test.axblrnw.mongodb.net') {
    console.error(`⛔ FATAL: Refusing execution. Target host "${host}" does not match shopsphere-test.axblrnw.mongodb.net.`);
    process.exit(1);
  }

  if (dbName !== 'shopsphere_test') {
    console.error(`⛔ FATAL: Refusing execution. Target database "${dbName}" does not match shopsphere_test.`);
    process.exit(1);
  }

  if (targetUri.includes('cluster0.1khdiho.mongodb.net') || dbName === 'shopsphere') {
    console.error('⛔ FATAL: Production Cluster0 or database detected. Execution aborted!');
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('🛡️  ShopSphere Safe Demo Bootstrap Sequence');
  console.log(`📡 Target Cluster Host: ${host}`);
  console.log(`📂 Target Database:     ${dbName}`);
  console.log('======================================================\n');

  try {
    await connectDB({ uri: targetUri });

    // 2. Upsert Demo Admin Account
    const adminPasswordHash = await bcrypt.hash(DEMO_ADMIN.passwordPlain, 10);
    const adminUser = await User.findOneAndUpdate(
      { email: DEMO_ADMIN.email },
      {
        name: DEMO_ADMIN.name,
        email: DEMO_ADMIN.email,
        passwordHash: adminPasswordHash,
        role: DEMO_ADMIN.role,
        phone: DEMO_ADMIN.phone,
        isActive: true,
        failedLoginAttempts: 0,
        lockUntil: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Demo Admin Account synced:    ${adminUser.email} (Role: ${adminUser.role})`);

    // 3. Upsert Demo Customer Account
    const customerPasswordHash = await bcrypt.hash(DEMO_CUSTOMER.passwordPlain, 10);
    const customerUser = await User.findOneAndUpdate(
      { email: DEMO_CUSTOMER.email },
      {
        name: DEMO_CUSTOMER.name,
        email: DEMO_CUSTOMER.email,
        passwordHash: customerPasswordHash,
        role: DEMO_CUSTOMER.role,
        phone: DEMO_CUSTOMER.phone,
        isActive: true,
        savedAddresses: DEMO_CUSTOMER.savedAddresses,
        failedLoginAttempts: 0,
        lockUntil: null
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Demo Customer Account synced: ${customerUser.email} (Role: ${customerUser.role})`);

    // 4. Ensure baseline coupons exist
    await Coupon.findOneAndUpdate(
      { code: 'FIRST10' },
      {
        code: 'FIRST10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 999,
        maxDiscountAmount: 300,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Demo Coupon synced:           FIRST10 (10% off)`);

    // 5. Check catalog data
    const catCount = await Category.countDocuments();
    const prodCount = await Product.countDocuments();
    console.log(`📊 Current Catalog Status:       ${catCount} categories, ${prodCount} products`);

    console.log('\n======================================================');
    console.log('🎉 DEMO ACCOUNTS READY FOR CLIENT PRESENTATION:');
    console.log('------------------------------------------------------');
    console.log('👤 Customer Login:');
    console.log(`   Email:    ${DEMO_CUSTOMER.email}`);
    console.log('   Password: [CONFIGURED SECURELY]');
    console.log('   Role:     Customer (Shopping, Bag, Wishlist, Orders)');
    console.log('------------------------------------------------------');
    console.log('🛡️  Admin Login:');
    console.log(`   Email:    ${DEMO_ADMIN.email}`);
    console.log('   Password: [CONFIGURED SECURELY]');
    console.log('   Role:     Admin (Dashboard, Products, Orders, Analytics)');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ Error during demo bootstrap:', err.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

bootstrapDemo();
