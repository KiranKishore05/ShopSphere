import { describe, it, expect } from 'vitest';
import mongoose from 'mongoose';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';
import { isOrderOwner, verifyOrderConsistency } from '../src/controllers/orderController.js';
import { inspectIndexState, TARGET_INDEX_SPECS } from '../src/scripts/migrate-indexes.js';

describe('Phase 9: Index Hardening & Safety Corrections Suite', () => {
  describe('1. Mongoose Model Index Specifications', () => {
    it('Order model declares partial unique index on idempotencyKey', () => {
      const indexes = Order.schema.indexes();
      const idempotencyIndex = indexes.find(
        (idx) => idx[0] && idx[0].idempotencyKey === 1
      );

      expect(idempotencyIndex).toBeDefined();
      expect(idempotencyIndex[0]).toEqual({ idempotencyKey: 1 });
      expect(idempotencyIndex[1]?.unique).toBe(true);
      expect(idempotencyIndex[1]?.partialFilterExpression).toEqual({
        idempotencyKey: { $type: 'string' }
      });
    });

    it('Payment model declares partial unique index on razorpayPaymentId', () => {
      const indexes = Payment.schema.indexes();
      const rzpPaymentIndex = indexes.find(
        (idx) => idx[0] && idx[0].razorpayPaymentId === 1
      );

      expect(rzpPaymentIndex).toBeDefined();
      expect(rzpPaymentIndex[0]).toEqual({ razorpayPaymentId: 1 });
      expect(rzpPaymentIndex[1]?.unique).toBe(true);
      expect(rzpPaymentIndex[1]?.partialFilterExpression).toEqual({
        razorpayPaymentId: { $type: 'string' }
      });
    });

    it('User model declares partial index on passwordResetToken without unique constraint', () => {
      const indexes = User.schema.indexes();
      const resetTokenIndex = indexes.find(
        (idx) => idx[0] && idx[0].passwordResetToken === 1
      );

      expect(resetTokenIndex).toBeDefined();
      expect(resetTokenIndex[0]).toEqual({ passwordResetToken: 1 });
      expect(resetTokenIndex[1]?.partialFilterExpression).toEqual({
        passwordResetToken: { $type: 'string' }
      });
      // Crucial: Must NOT be unique
      expect(resetTokenIndex[1]?.unique).toBeFalsy();
    });
  });

  describe('2. ObjectId Ownership Comparison & Cross-User Security', () => {
    const rawIdString = '6aef24e85013e5e614f0ca77';
    const differentIdString = '6aef342664ac029f96bb0b65';

    it('correctly recognizes the same user when ObjectId instances are separate objects with the same underlying ID', () => {
      const orderObjectId = new mongoose.Types.ObjectId(rawIdString);
      const userObjectId = new mongoose.Types.ObjectId(rawIdString);

      // Verify they are separate object references in memory
      expect(orderObjectId === userObjectId).toBe(false);

      const mockOrder = { userId: orderObjectId };
      const mockUser = { _id: userObjectId };

      expect(isOrderOwner(mockOrder, mockUser)).toBe(true);
    });

    it('correctly handles populated userId references ({ _id: ObjectId })', () => {
      const orderPopulatedUser = {
        userId: { _id: new mongoose.Types.ObjectId(rawIdString), name: 'Aria' }
      };
      const mockUser = { _id: new mongoose.Types.ObjectId(rawIdString) };

      expect(isOrderOwner(orderPopulatedUser, mockUser)).toBe(true);
    });

    it('correctly handles raw string userId references', () => {
      const mockOrder = { userId: rawIdString };
      const mockUser = { _id: rawIdString };

      expect(isOrderOwner(mockOrder, mockUser)).toBe(true);
    });

    it('rejects ownership when a different user claims an order (cross-user idempotency collision)', () => {
      const victimOrder = { userId: new mongoose.Types.ObjectId(rawIdString) };
      const attackerUser = { _id: new mongoose.Types.ObjectId(differentIdString) };

      expect(isOrderOwner(victimOrder, attackerUser)).toBe(false);
    });

    it('rejects ownership when either order or user is null or missing ID', () => {
      expect(isOrderOwner(null, { _id: '123' })).toBe(false);
      expect(isOrderOwner({ userId: '123' }, null)).toBe(false);
      expect(isOrderOwner({ userId: null }, { _id: '123' })).toBe(false);
    });
  });

  describe('3. Strengthened Checkout Payload Consistency Validation', () => {
    const baseAddress = {
      fullName: 'Aria Vance',
      streetAddress: '123 Atelier Way',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India'
    };

    const baseItem1 = {
      variantSku: 'BLZ-BLK-M',
      quantity: 1,
      unitPrice: 2000,
      lineTotal: 2000
    };

    const baseItem2 = {
      variantSku: 'TRS-WHT-32',
      quantity: 2,
      unitPrice: 1500,
      lineTotal: 3000
    };

    const baseOrder = {
      paymentMethod: 'cod',
      couponCode: 'ATELIER10',
      shippingAddressSnapshot: { ...baseAddress },
      items: [{ ...baseItem1 }, { ...baseItem2 }],
      subtotal: 5000,
      total: 4500
    };

    it('accepts identical duplicate request: same user, same key, same payload', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'ATELIER10' },
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [{ ...baseItem1 }, { ...baseItem2 }]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(true);
    });

    it('rejects when items differ: same user, same key, different products', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'ATELIER10' },
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [
          { ...baseItem1 },
          { variantSku: 'DIFFERENT-SKU', quantity: 2, unitPrice: 1500, lineTotal: 3000 }
        ]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('rejects when quantities differ: same user, same key, different quantities', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'ATELIER10' },
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [
          { ...baseItem1, quantity: 3 }, // Changed quantity!
          { ...baseItem2 }
        ]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('rejects when address differs: same user, same key, different street address or postal code', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'ATELIER10' },
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress, postalCode: '560001' }, // Changed postal code!
        itemsSnapshot: [{ ...baseItem1 }, { ...baseItem2 }]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('rejects when coupon differs: same user, same key, different coupon', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'DIFFERENTCOUPON' }, // Changed coupon!
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [{ ...baseItem1 }, { ...baseItem2 }]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('rejects when paymentMethod differs: same user, same key, cod vs razorpay', () => {
      const requestedPayload = {
        paymentMethod: 'razorpay', // Changed from cod to razorpay!
        coupon: { code: 'ATELIER10' },
        total: 4500,
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [{ ...baseItem1 }, { ...baseItem2 }]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('rejects when server-authoritative totals mismatch', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        coupon: { code: 'ATELIER10' },
        total: 9999, // Mismatched total!
        subtotal: 5000,
        resolvedAddress: { ...baseAddress },
        itemsSnapshot: [{ ...baseItem1 }, { ...baseItem2 }]
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });

    it('accepts sequential duplicate request when cart is already cleared (itemsSnapshot omitted)', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        couponCode: 'ATELIER10',
        resolvedAddress: { ...baseAddress }
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(true);
    });

    it('rejects sequential duplicate request when couponCode differs as string', () => {
      const requestedPayload = {
        paymentMethod: 'cod',
        couponCode: 'WRONGCOUPON',
        resolvedAddress: { ...baseAddress }
      };

      expect(verifyOrderConsistency(baseOrder, requestedPayload)).toBe(false);
    });
  });

  describe('4. Migration Crash Recovery State Inspection', () => {
    const ordersSpec = TARGET_INDEX_SPECS.orders;

    it('detects LEGACY_INDEX when index is non-unique and has no partialFilterExpression', () => {
      const existingIndexes = [
        { name: '_id_', key: { _id: 1 } },
        { name: 'idempotencyKey_1', key: { idempotencyKey: 1 }, unique: false }
      ];

      const res = inspectIndexState(existingIndexes, ordersSpec);
      expect(res.state).toBe('LEGACY_INDEX');
      expect(res.index.name).toBe('idempotencyKey_1');
    });

    it('detects ALREADY_MIGRATED when partialFilterExpression and unique match target specification', () => {
      const existingIndexes = [
        { name: '_id_', key: { _id: 1 } },
        {
          name: 'idempotencyKey_1',
          key: { idempotencyKey: 1 },
          unique: true,
          partialFilterExpression: { idempotencyKey: { $type: 'string' } }
        }
      ];

      const res = inspectIndexState(existingIndexes, ordersSpec);
      expect(res.state).toBe('ALREADY_MIGRATED');
    });

    it('detects MISSING_INDEX when index does not exist (interruption recovery after drop)', () => {
      const existingIndexes = [
        { name: '_id_', key: { _id: 1 } }
      ];

      const res = inspectIndexState(existingIndexes, ordersSpec);
      expect(res.state).toBe('MISSING_INDEX');
      expect(res.index).toBeNull();
    });

    it('detects UNEXPECTED_STATE when index options differ from both legacy and target (refuses automatic migration)', () => {
      const existingIndexes = [
        {
          name: 'idempotencyKey_1',
          key: { idempotencyKey: 1 },
          unique: true,
          // Missing partialFilterExpression!
        }
      ];

      const res = inspectIndexState(existingIndexes, ordersSpec);
      expect(res.state).toBe('UNEXPECTED_STATE');
    });
  });
});
