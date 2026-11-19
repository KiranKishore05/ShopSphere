import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Atomically deduct inventory for all items in an order.
 * Guarantees:
 * - Exactly-once execution per order (prevents duplicate deduction under concurrent webhook & verification).
 * - Prevents overselling under concurrent requests using atomic conditional updates.
 * - Records audit entries in InventoryMovement collection.
 * - Supports multi-document transactions where sessions are provided.
 * - Automatically rolls back partial deductions if an item fails validation.
 */
export const deductOrderInventory = async (order, externalSession = null) => {
  if (!order.items || order.items.length === 0) {
    return true;
  }

  const sessionOpts = externalSession ? { session: externalSession } : {};

  // 1. Idempotency & Concurrency Gate: Atomically claim inventory deduction for this order
  if (order._id && mongoose.connection?.readyState !== 0) {
    const claimedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        inventoryDeducted: { $ne: true }
      },
      {
        $set: { inventoryDeducted: true }
      },
      { new: true, ...sessionOpts }
    );

    if (!claimedOrder) {
      // Inventory was already claimed/deducted for this order by another concurrent request or webhook
      return true;
    }
  }

  const recordedMovements = [];

  try {
    for (const item of order.items) {
      // Atomically find product with matching variant and sufficient stock
      const product = await Product.findOne(
        {
          _id: item.productId,
          'variants.sku': item.variantSku.toUpperCase()
        },
        null,
        sessionOpts
      );

      if (!product) {
        throw new AppError(`Product '${item.name}' or variant '${item.variantSku}' no longer exists.`, 404, 'PRODUCT_NOT_FOUND');
      }

      const variant = product.variants.find(v => v.sku.toUpperCase() === item.variantSku.toUpperCase());
      if (!variant || variant.stockQuantity < item.quantity) {
        throw new AppError(
          `Insufficient inventory for '${item.name}' (${item.variantSku}). Available: ${variant ? variant.stockQuantity : 0}, requested: ${item.quantity}.`,
          400,
          'INSUFFICIENT_STOCK'
        );
      }

      const previousStock = variant.stockQuantity;
      const newStock = previousStock - item.quantity;

      // Atomic update with concurrency guard
      const updated = await Product.findOneAndUpdate(
        {
          _id: item.productId,
          'variants.sku': item.variantSku.toUpperCase(),
          'variants.stockQuantity': { $gte: item.quantity }
        },
        {
          $inc: {
            'variants.$.stockQuantity': -item.quantity,
            totalSalesCount: item.quantity
          }
        },
        { new: true, ...sessionOpts }
      );

      if (!updated) {
        throw new AppError(
          `Inventory conflict: stock for '${item.name}' changed during checkout. Please review your bag.`,
          409,
          'INVENTORY_CONFLICT'
        );
      }

      recordedMovements.push({
        productId: item.productId,
        variantSku: item.variantSku.toUpperCase(),
        quantity: item.quantity
      });

      // Record audit movement
      await InventoryMovement.create(
        [{
          productId: item.productId,
          variantSku: item.variantSku.toUpperCase(),
          quantityChange: -item.quantity,
          previousStock,
          newStock,
          reason: 'order_placed',
          orderId: order._id,
          note: `Deducted for Order ${order.orderNumber}`
        }],
        sessionOpts
      );
    }
  } catch (err) {
    // If any item fails, rollback previously deducted items in this execution
    for (const rev of recordedMovements) {
      await Product.updateOne(
        { _id: rev.productId, 'variants.sku': rev.variantSku },
        { $inc: { 'variants.$.stockQuantity': rev.quantity, totalSalesCount: -rev.quantity } },
        sessionOpts
      );
    }

    // Release the inventoryDeducted claim on the order if failed
    if (order._id) {
      await Order.updateOne(
        { _id: order._id },
        { $set: { inventoryDeducted: false } },
        sessionOpts
      );
    }

    throw err;
  }

  return true;
};

/**
 * Restore inventory when an order is cancelled.
 * Guarantees idempotency: stock is only restored if inventory was previously deducted.
 */
export const restoreOrderInventory = async (order, reason = 'order_cancelled', externalSession = null) => {
  const sessionOpts = externalSession ? { session: externalSession } : {};

  // Idempotency Gate: Only restore if inventory was actually deducted
  if (order._id && mongoose.connection?.readyState !== 0) {
    const releasedOrder = await Order.findOneAndUpdate(
      {
        _id: order._id,
        inventoryDeducted: true
      },
      {
        $set: { inventoryDeducted: false }
      },
      { new: true, ...sessionOpts }
    );

    if (!releasedOrder) {
      // Inventory was never deducted, or already restored!
      return true;
    }
  }

  for (const item of order.items) {
    const product = await Product.findOne(
      {
        _id: item.productId,
        'variants.sku': item.variantSku.toUpperCase()
      },
      null,
      sessionOpts
    );

    if (!product) continue;

    const variant = product.variants.find(v => v.sku.toUpperCase() === item.variantSku.toUpperCase());
    const previousStock = variant ? variant.stockQuantity : 0;
    const newStock = previousStock + item.quantity;

    await Product.updateOne(
      { _id: item.productId, 'variants.sku': item.variantSku.toUpperCase() },
      {
        $inc: {
          'variants.$.stockQuantity': item.quantity,
          totalSalesCount: -item.quantity
        }
      },
      sessionOpts
    );

    await InventoryMovement.create(
      [{
        productId: item.productId,
        variantSku: item.variantSku.toUpperCase(),
        quantityChange: item.quantity,
        previousStock,
        newStock,
        reason,
        orderId: order._id,
        note: `Restored from Order ${order.orderNumber} (${reason})`
      }],
      sessionOpts
    );
  }

  return true;
};
