import dotenv from 'dotenv';
import mongoose from 'mongoose';
import readline from 'readline';
import { z } from 'zod';
import { User } from '../models/User.js';

const strongPasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters long')
  .max(100, 'Password cannot exceed 100 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^_\-.~+=])/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&#^_-.~+=)'
  );

async function promptPassword() {
  if (process.env.ADMIN_NEW_PASSWORD) {
    return process.env.ADMIN_NEW_PASSWORD;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('Enter new secure password for admin@shopsphere.in: ', (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function run() {
  dotenv.config({ path: 'server/.env.test.local' });
  const uri = process.env.TEST_MONGODB_URI;

  if (!uri) {
    console.error('[Error] TEST_MONGODB_URI is not defined in server/.env.test.local');
    process.exit(1);
  }

  const parsed = new URL(uri);
  if (parsed.hostname !== 'shopsphere-test.axblrnw.mongodb.net' || parsed.pathname !== '/shopsphere_test') {
    console.error('[Security Abort] Connection blocked. Target must strictly be shopsphere-test.axblrnw.mongodb.net/shopsphere_test');
    process.exit(1);
  }

  const rawPassword = await promptPassword();
  const validation = strongPasswordSchema.safeParse(rawPassword);

  if (!validation.success) {
    console.error('\n[Validation Error] Password does not meet security requirements:');
    validation.error.errors.forEach(e => console.error(` - ${e.message}`));
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const admin = await db.collection('users').findOne({ email: 'admin@shopsphere.in' });
  if (!admin) {
    console.error('[Error] admin@shopsphere.in not found in shopsphere_test.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const newHash = await User.hashPassword(rawPassword);

  const result = await db.collection('users').updateOne(
    { email: 'admin@shopsphere.in' },
    {
      $set: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
        failedLoginAttempts: 0,
        lockUntil: null
      }
    }
  );

  await mongoose.disconnect();

  if (result.modifiedCount === 1) {
    console.log('\n======================================================');
    console.log('✅ Admin password successfully updated in shopsphere_test');
    console.log(`   Account ID : ${admin._id}`);
    console.log(`   Email      : ${admin.email}`);
    console.log(`   Role       : ${admin.role}`);
    console.log(`   Timestamp  : ${new Date().toISOString()}`);
    console.log('======================================================');
  } else {
    console.log('\n[Warning] No record was modified.');
  }
}

run().catch((err) => {
  console.error('[Error]', err.message);
  process.exit(1);
});
