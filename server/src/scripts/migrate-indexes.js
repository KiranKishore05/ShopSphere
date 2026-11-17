/**
 * ShopSphere — Phase 9 Database Index Hardening Migration
 *
 * Implements staged partial unique index transitions for:
 * 1. Order.idempotencyKey (partial unique on string)
 * 2. Payment.razorpayPaymentId (partial unique on string)
 * 3. User.passwordResetToken (partial lookup on string)
 *
 * CRITICAL SAFETY & COEXISTENCE ARCHITECTURE:
 * - In MongoDB (all modern versions 4.4+), MongoDB DOES NOT permit two indexes with the
 *   exact same key pattern (e.g. { idempotencyKey: 1 }) to coexist on the same collection
 *   with different options (IndexAlreadyExists).
 * - NON-ATOMIC NOTICE: This migration is NOT atomic. If process termination, SIGKILL, or
 *   network disruption occurs between drop and create steps, the collection may temporarily
 *   lack the index.
 * - CRASH RECOVERY: This script is fully idempotent and inspects the existing state on every run:
 *     - If the target partial index is ALREADY present and valid, it is left untouched.
 *     - If an index is MISSING (e.g. previous crash after drop), it creates the target index.
 *     - If a LEGACY index is present, it validates 0 string duplicates, drops the legacy index,
 *       and builds the new partial index with immediate rollback catch protection.
 *     - If an UNEXPECTED index configuration is detected, it REFUSES to proceed and halts.
 * - SCRIPT DEFAULTS TO DRY-RUN. Live execution strictly requires the --apply CLI flag.
 */

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database.js';

/**
 * Expected target index configurations.
 */
export const TARGET_INDEX_SPECS = {
  orders: {
    field: 'idempotencyKey',
    key: { idempotencyKey: 1 },
    name: 'idempotencyKey_1',
    options: {
      unique: true,
      partialFilterExpression: { idempotencyKey: { $type: 'string' } }
    }
  },
  payments: {
    field: 'razorpayPaymentId',
    key: { razorpayPaymentId: 1 },
    name: 'razorpayPaymentId_1',
    options: {
      unique: true,
      partialFilterExpression: { razorpayPaymentId: { $type: 'string' } }
    }
  },
  users: {
    field: 'passwordResetToken',
    key: { passwordResetToken: 1 },
    name: 'passwordResetToken_1',
    options: {
      unique: false,
      partialFilterExpression: { passwordResetToken: { $type: 'string' } }
    }
  }
};

/**
 * Inspects the current state of an index on a collection.
 * Returns: 'ALREADY_MIGRATED' | 'LEGACY_INDEX' | 'MISSING_INDEX' | 'UNEXPECTED_STATE'
 */
export const inspectIndexState = (existingIndexes, spec) => {
  const matchingIndex = existingIndexes.find(idx => {
    const keys = Object.keys(idx.key || {});
    const targetKeys = Object.keys(spec.key);
    return keys.length === targetKeys.length && keys.every(k => idx.key[k] === spec.key[k]);
  });

  if (!matchingIndex) {
    return { state: 'MISSING_INDEX', index: null };
  }

  const isUnique = Boolean(matchingIndex.unique);
  const targetUnique = Boolean(spec.options.unique);
  const partialFilter = matchingIndex.partialFilterExpression;
  const targetFilter = spec.options.partialFilterExpression;

  const partialMatches =
    Boolean(partialFilter) === Boolean(targetFilter) &&
    JSON.stringify(partialFilter) === JSON.stringify(targetFilter);

  if (isUnique === targetUnique && partialMatches) {
    return { state: 'ALREADY_MIGRATED', index: matchingIndex };
  }

  // Legacy index: non-unique and no partialFilterExpression
  if (!isUnique && !partialFilter) {
    return { state: 'LEGACY_INDEX', index: matchingIndex };
  }

  return { state: 'UNEXPECTED_STATE', index: matchingIndex };
};

export const runIndexMigration = async ({ apply = false } = {}) => {
  console.log(`\n======================================================`);
  console.log(`ShopSphere Index Hardening Migration`);
  console.log(`Mode: ${apply ? 'APPLY (LIVE EXECUTION)' : 'DRY-RUN (INSPECTION ONLY)'}`);
  console.log(`Atomicity Notice: MongoDB index migrations are non-atomic.`);
  console.log(`======================================================\n`);

  await connectDB({ retry: true, maxRetries: 2 });
  const db = mongoose.connection.db;

  const migrationSummary = {
    orders: { initial: null, action: null, final: null, status: 'pending' },
    payments: { initial: null, action: null, final: null, status: 'pending' },
    users: { initial: null, action: null, final: null, status: 'pending' }
  };

  try {
    // ----------------------------------------------------
    // 1. ORDERS: idempotencyKey
    // ----------------------------------------------------
    console.log('1. Auditing Order.idempotencyKey...');
    const orderIndexes = await db.collection('orders').indexes();
    const orderInspection = inspectIndexState(orderIndexes, TARGET_INDEX_SPECS.orders);
    migrationSummary.orders.initial = orderInspection.state;
    console.log(`   - Detected state: ${orderInspection.state}`);

    if (orderInspection.state === 'UNEXPECTED_STATE') {
      throw new Error(
        `Orders index is in UNEXPECTED_STATE (${JSON.stringify(orderInspection.index)}). Refusing to proceed automatically. Manual DB review required.`
      );
    }

    // Check for string duplicate keys
    const orderDupes = await db.collection('orders').aggregate([
      { $match: { idempotencyKey: { $type: 'string' } } },
      { $group: { _id: '$idempotencyKey', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (orderDupes.length > 0) {
      throw new Error(`Migration aborted: ${orderDupes.length} duplicate idempotencyKey strings found in orders!`);
    }
    console.log('   - Duplicate pre-check passed: 0 duplicate string idempotency keys.');

    if (orderInspection.state === 'ALREADY_MIGRATED') {
      console.log('   ✅ Index already migrated with exact options. Skipping.');
      migrationSummary.orders.action = 'NONE (Already Migrated)';
      migrationSummary.orders.status = 'VERIFIED';
    } else if (!apply) {
      migrationSummary.orders.action = `WOULD_APPLY (${orderInspection.state} -> partial unique)`;
      migrationSummary.orders.status = 'READY_TO_APPLY';
    } else {
      // Live migration with crash-recovery catch
      if (orderInspection.state === 'LEGACY_INDEX') {
        console.log(`   - Dropping legacy index: ${orderInspection.index.name}...`);
        await db.collection('orders').dropIndex(orderInspection.index.name);
      } else {
        console.log('   - Previous index missing (interruption recovery). Creating target index directly...');
      }

      try {
        console.log('   - Creating partial unique index on idempotencyKey...');
        await db.collection('orders').createIndex(
          TARGET_INDEX_SPECS.orders.key,
          {
            name: TARGET_INDEX_SPECS.orders.name,
            unique: TARGET_INDEX_SPECS.orders.options.unique,
            partialFilterExpression: TARGET_INDEX_SPECS.orders.options.partialFilterExpression
          }
        );
      } catch (err) {
        console.error('   ❌ Index creation failed! Attempting rollback to legacy index...');
        try {
          await db.collection('orders').createIndex(
            TARGET_INDEX_SPECS.orders.key,
            { name: TARGET_INDEX_SPECS.orders.name }
          );
          console.log('   ⚠️ Rollback successful: Recreated legacy non-unique index.');
        } catch (rollbackErr) {
          console.error('   CRITICAL: Rollback recreation failed! Recovery instructions:');
          console.error(`   Run: db.orders.createIndex({ idempotencyKey: 1 }, { name: 'idempotencyKey_1' })`);
        }
        throw err;
      }

      // Verification of final options
      const postOrderIndexes = await db.collection('orders').indexes();
      const postInspection = inspectIndexState(postOrderIndexes, TARGET_INDEX_SPECS.orders);
      if (postInspection.state !== 'ALREADY_MIGRATED') {
        throw new Error('Post-creation verification failed for orders.idempotencyKey options!');
      }
      console.log('   ✅ Successfully verified orders.idempotencyKey partial unique index.');
      migrationSummary.orders.final = postInspection.state;
      migrationSummary.orders.status = 'MIGRATED_AND_VERIFIED';
    }

    // ----------------------------------------------------
    // 2. PAYMENTS: razorpayPaymentId
    // ----------------------------------------------------
    console.log('\n2. Auditing Payment.razorpayPaymentId...');
    const paymentIndexes = await db.collection('payments').indexes();
    const paymentInspection = inspectIndexState(paymentIndexes, TARGET_INDEX_SPECS.payments);
    migrationSummary.payments.initial = paymentInspection.state;
    console.log(`   - Detected state: ${paymentInspection.state}`);

    if (paymentInspection.state === 'UNEXPECTED_STATE') {
      throw new Error(
        `Payments index is in UNEXPECTED_STATE (${JSON.stringify(paymentInspection.index)}). Refusing to proceed automatically. Manual DB review required.`
      );
    }

    // Check for string duplicate keys
    const paymentDupes = await db.collection('payments').aggregate([
      { $match: { razorpayPaymentId: { $type: 'string' } } },
      { $group: { _id: '$razorpayPaymentId', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]).toArray();

    if (paymentDupes.length > 0) {
      throw new Error(`Migration aborted: ${paymentDupes.length} duplicate razorpayPaymentId strings found in payments!`);
    }
    console.log('   - Duplicate pre-check passed: 0 duplicate string payment IDs.');

    if (paymentInspection.state === 'ALREADY_MIGRATED') {
      console.log('   ✅ Index already migrated with exact options. Skipping.');
      migrationSummary.payments.action = 'NONE (Already Migrated)';
      migrationSummary.payments.status = 'VERIFIED';
    } else if (!apply) {
      migrationSummary.payments.action = `WOULD_APPLY (${paymentInspection.state} -> partial unique)`;
      migrationSummary.payments.status = 'READY_TO_APPLY';
    } else {
      if (paymentInspection.state === 'LEGACY_INDEX') {
        console.log(`   - Dropping legacy index: ${paymentInspection.index.name}...`);
        await db.collection('payments').dropIndex(paymentInspection.index.name);
      } else {
        console.log('   - Previous index missing (interruption recovery). Creating target index directly...');
      }

      try {
        console.log('   - Creating partial unique index on razorpayPaymentId...');
        await db.collection('payments').createIndex(
          TARGET_INDEX_SPECS.payments.key,
          {
            name: TARGET_INDEX_SPECS.payments.name,
            unique: TARGET_INDEX_SPECS.payments.options.unique,
            partialFilterExpression: TARGET_INDEX_SPECS.payments.options.partialFilterExpression
          }
        );
      } catch (err) {
        console.error('   ❌ Index creation failed! Attempting rollback to legacy index...');
        try {
          await db.collection('payments').createIndex(
            TARGET_INDEX_SPECS.payments.key,
            { name: TARGET_INDEX_SPECS.payments.name }
          );
          console.log('   ⚠️ Rollback successful: Recreated legacy non-unique index.');
        } catch (rollbackErr) {
          console.error('   CRITICAL: Rollback recreation failed! Recovery instructions:');
          console.error(`   Run: db.payments.createIndex({ razorpayPaymentId: 1 }, { name: 'razorpayPaymentId_1' })`);
        }
        throw err;
      }

      // Verification of final options
      const postPaymentIndexes = await db.collection('payments').indexes();
      const postInspection = inspectIndexState(postPaymentIndexes, TARGET_INDEX_SPECS.payments);
      if (postInspection.state !== 'ALREADY_MIGRATED') {
        throw new Error('Post-creation verification failed for payments.razorpayPaymentId options!');
      }
      console.log('   ✅ Successfully verified payments.razorpayPaymentId partial unique index.');
      migrationSummary.payments.final = postInspection.state;
      migrationSummary.payments.status = 'MIGRATED_AND_VERIFIED';
    }

    // ----------------------------------------------------
    // 3. USERS: passwordResetToken
    // ----------------------------------------------------
    console.log('\n3. Auditing User.passwordResetToken...');
    const userIndexes = await db.collection('users').indexes();
    const userInspection = inspectIndexState(userIndexes, TARGET_INDEX_SPECS.users);
    migrationSummary.users.initial = userInspection.state;
    console.log(`   - Detected state: ${userInspection.state}`);

    if (userInspection.state === 'UNEXPECTED_STATE') {
      throw new Error(
        `Users index is in UNEXPECTED_STATE (${JSON.stringify(userInspection.index)}). Refusing to proceed automatically.`
      );
    }

    if (userInspection.state === 'ALREADY_MIGRATED') {
      console.log('   ✅ Partial lookup index already exists. Skipping.');
      migrationSummary.users.action = 'NONE (Already Migrated)';
      migrationSummary.users.status = 'VERIFIED';
    } else if (!apply) {
      migrationSummary.users.action = 'WOULD_APPLY (Create partial lookup index)';
      migrationSummary.users.status = 'READY_TO_APPLY';
    } else {
      console.log('   - Creating partial lookup index on passwordResetToken...');
      await db.collection('users').createIndex(
        TARGET_INDEX_SPECS.users.key,
        {
          name: TARGET_INDEX_SPECS.users.name,
          partialFilterExpression: TARGET_INDEX_SPECS.users.options.partialFilterExpression
        }
      );

      const postUserIndexes = await db.collection('users').indexes();
      const postInspection = inspectIndexState(postUserIndexes, TARGET_INDEX_SPECS.users);
      if (postInspection.state !== 'ALREADY_MIGRATED') {
        throw new Error('Post-creation verification failed for users.passwordResetToken!');
      }
      console.log('   ✅ Successfully verified users.passwordResetToken partial index.');
      migrationSummary.users.final = postInspection.state;
      migrationSummary.users.status = 'MIGRATED_AND_VERIFIED';
    }

    console.log('\n======================================================');
    console.log('Migration Plan & Status Summary:');
    console.log(JSON.stringify(migrationSummary, null, 2));
    console.log('======================================================\n');

    return migrationSummary;
  } finally {
    await disconnectDB();
  }
};

// If executed directly from command line
if (process.argv[1] && process.argv[1].endsWith('migrate-indexes.js')) {
  const isApply = process.argv.includes('--apply');
  runIndexMigration({ apply: isApply })
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration execution failed:', err);
      process.exit(1);
    });
}
