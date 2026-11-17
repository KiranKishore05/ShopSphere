import dbConnect from '../config/database.js';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';
import { consumeOrderCoupon, releaseOrderCoupon } from '../services/couponService.js';

async function runLiveConcurrencyVerification() {
  console.log('📡 Initializing database connection for Live Concurrency & Transaction Verification...');
  await dbConnect();

  const tempCode = `TESTCONC_${Date.now()}`;
  const tempOrderNumber = `TEMP-CONC-${Date.now()}`;

  let tempCoupon = null;
  let tempOrder = null;

  try {
    // 1. Create isolated ephemeral test coupon
    tempCoupon = await Coupon.create({
      code: tempCode,
      discountType: 'percentage',
      discountValue: 15,
      minOrderAmount: 1000,
      usageLimit: 10,
      usedCount: 0,
      startDate: new Date(Date.now() - 3600000), // 1 hour ago
      expiryDate: new Date(Date.now() + 86400000), // 24 hours from now
      isActive: true
    });
    console.log(`✅ Created ephemeral test coupon: ${tempCoupon.code} (Initial usedCount: ${tempCoupon.usedCount})`);

    // 2. Create isolated ephemeral test order
    tempOrder = await Order.create({
      orderNumber: tempOrderNumber,
      userId: new mongoose.Types.ObjectId(),
      items: [{
        productId: new mongoose.Types.ObjectId(),
        variantSku: 'SKU-CONC-TEST',
        name: 'Concurrency Test Garment',
        size: 'M',
        color: { name: 'Noir', hexCode: '#000000' },
        image: 'https://example.com/test.jpg',
        unitPrice: 2000,
        quantity: 1,
        lineTotal: 2000
      }],
      shippingAddressSnapshot: {
        fullName: 'Test Auditor',
        phone: '9876543210',
        streetAddress: '123 Concurrency Way',
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400001',
        country: 'India'
      },
      subtotal: 2000,
      discount: 300,
      shippingFee: 0,
      tax: 0,
      total: 1700,
      couponCode: tempCoupon.code,
      couponId: tempCoupon._id,
      paymentMethod: 'razorpay',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment',
      couponUsageApplied: false,
      couponUsageReleased: false
    });
    console.log(`✅ Created ephemeral test order: ${tempOrder.orderNumber}`);

    // 3. Test: Real Simultaneous consumeOrderCoupon Calls
    console.log('\n--- Test 1: Real Simultaneous consumeOrderCoupon Execution ---');
    const [consumeRes1, consumeRes2] = await Promise.all([
      consumeOrderCoupon(tempOrder._id),
      consumeOrderCoupon(tempOrder._id)
    ]);

    console.log('Worker 1 Result:', consumeRes1);
    console.log('Worker 2 Result:', consumeRes2);

    const consumeResults = [consumeRes1, consumeRes2];
    const successfulConsumes = consumeResults.filter(r => r.consumed === true);
    const redundantConsumes = consumeResults.filter(r => r.alreadyApplied === true);

    if (successfulConsumes.length !== 1 || redundantConsumes.length !== 1) {
      throw new Error(`CONCURRENCY VIOLATION in consumeOrderCoupon! Expected 1 success and 1 alreadyApplied, received: ${JSON.stringify(consumeResults)}`);
    }

    const couponAfterConsume = await Coupon.findById(tempCoupon._id);
    const orderAfterConsume = await Order.findById(tempOrder._id);

    console.log(`Verified Coupon usedCount: ${couponAfterConsume.usedCount} (Expected: 1)`);
    console.log(`Verified Order couponUsageApplied: ${orderAfterConsume.couponUsageApplied} (Expected: true)`);

    if (couponAfterConsume.usedCount !== 1) {
      throw new Error(`Coupon usedCount mismatch! Expected 1, got ${couponAfterConsume.usedCount}`);
    }
    if (orderAfterConsume.couponUsageApplied !== true) {
      throw new Error(`Order couponUsageApplied mismatch! Expected true, got ${orderAfterConsume.couponUsageApplied}`);
    }
    console.log('🎯 Test 1 PASSED: Exactly 1 coupon usage consumed under real concurrent execution!');

    // 4. Test: Real Simultaneous releaseOrderCoupon Calls
    console.log('\n--- Test 2: Real Simultaneous releaseOrderCoupon Execution ---');
    const [releaseRes1, releaseRes2] = await Promise.all([
      releaseOrderCoupon(tempOrder._id),
      releaseOrderCoupon(tempOrder._id)
    ]);

    console.log('Worker 1 Release Result:', releaseRes1);
    console.log('Worker 2 Release Result:', releaseRes2);

    const releaseResults = [releaseRes1, releaseRes2];
    const successfulReleases = releaseResults.filter(r => r.released === true);
    const redundantReleases = releaseResults.filter(r => r.released === false);

    if (successfulReleases.length !== 1 || redundantReleases.length !== 1) {
      throw new Error(`CONCURRENCY VIOLATION in releaseOrderCoupon! Expected 1 success and 1 redundant, received: ${JSON.stringify(releaseResults)}`);
    }

    const couponAfterRelease = await Coupon.findById(tempCoupon._id);
    const orderAfterRelease = await Order.findById(tempOrder._id);

    console.log(`Verified Coupon usedCount: ${couponAfterRelease.usedCount} (Expected: 0)`);
    console.log(`Verified Order couponUsageApplied: ${orderAfterRelease.couponUsageApplied} (Expected: false)`);
    console.log(`Verified Order couponUsageReleased: ${orderAfterRelease.couponUsageReleased} (Expected: true)`);

    if (couponAfterRelease.usedCount !== 0) {
      throw new Error(`Coupon usedCount mismatch! Expected 0, got ${couponAfterRelease.usedCount}`);
    }
    if (orderAfterRelease.couponUsageApplied !== false || orderAfterRelease.couponUsageReleased !== true) {
      throw new Error('Order flags inconsistent after release!');
    }
    console.log('🎯 Test 2 PASSED: Exactly 1 coupon usage released under real concurrent execution!');

  } finally {
    // 5. Clean up ephemeral records immediately
    console.log('\n--- Cleanup: Removing Ephemeral Test Records ---');
    if (tempCoupon?._id) {
      await Coupon.deleteOne({ _id: tempCoupon._id });
      console.log(`🧹 Deleted ephemeral coupon: ${tempCoupon.code}`);
    }
    if (tempOrder?._id) {
      await Order.deleteOne({ _id: tempOrder._id });
      console.log(`🧹 Deleted ephemeral order: ${tempOrder.orderNumber}`);
    }

    // 6. Final verification of historical counts
    const [products, categories, orders, payments, users, coupons] = await Promise.all([
      (await import('../models/Product.js')).default.countDocuments(),
      (await import('../models/Category.js')).default.countDocuments(),
      Order.countDocuments(),
      (await import('../models/Payment.js')).default.countDocuments(),
      (await import('../models/User.js')).default.countDocuments(),
      Coupon.countDocuments()
    ]);

    console.log('\n📊 Historical Database Integrity Verification:');
    console.log(JSON.stringify({ products, categories, orders, payments, users, coupons }, null, 2));

    await mongoose.disconnect();
    console.log('👋 Database connection closed.');
  }
}

runLiveConcurrencyVerification().then(() => {
  console.log('✨ Live Concurrency Verification Completed Successfully.');
  process.exit(0);
}).catch((err) => {
  console.error('❌ Live Concurrency Verification Failed:', err);
  process.exit(1);
});

