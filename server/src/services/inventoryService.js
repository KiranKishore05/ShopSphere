import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Atomically deduct inventory for all items in an order.
 * Prevents overselling under concurrent requests using atomic conditional updates.
 * Records audit entries in InventoryMovement collection.
 */
export const deductOrderInventory = async (order) => {
  const recordedMovements = [];

  for (const item of order.items) {
    // Atomically find product with matching variant and sufficient stock
    const product = await Product.findOne({
      _id: item.productId,
      'variants.sku': item.variantSku.toUpperCase()
    });

    if (!product) {
      throw new AppError(`Product '${item.name}' or variant '${item.variantSku}' no longer exists.`, 404, 'PRODUCT_NOT_FOUND');
    }

    const variant = product.variants.find(v => v.sku.toUpperCase() === item.variantSku.toUpperCase());
    if (!variant || variant.stockQuantity < item.quantity) {
      // If any item fails, rollback previously deducted items in this execution
      for (const rev of recordedMovements) {
        await Product.updateOne(
          { _id: rev.productId, 'variants.sku': rev.variantSku },
          { $inc: { 'variants.$.stockQuantity': rev.quantity, totalSalesCount: -rev.quantity } }
        );
      }
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
      { new: true }
    );

    if (!updated) {
      // Rollback previous
      for (const rev of recordedMovements) {
        await Product.updateOne(
          { _id: rev.productId, 'variants.sku': rev.variantSku },
          { $inc: { 'variants.$.stockQuantity': rev.quantity, totalSalesCount: -rev.quantity } }
        );
      }
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
    await InventoryMovement.create({
      productId: item.productId,
      variantSku: item.variantSku.toUpperCase(),
      quantityChange: -item.quantity,
      previousStock,
      newStock,
      reason: 'order_placed',
      orderId: order._id,
      note: `Deducted for Order ${order.orderNumber}`
    });
  }

  return true;
};

/**
 * Restore inventory when an order is cancelled.
 */
export const restoreOrderInventory = async (order, reason = 'order_cancelled') => {
  for (const item of order.items) {
    const product = await Product.findOne({
      _id: item.productId,
      'variants.sku': item.variantSku.toUpperCase()
    });

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
      }
    );

    await InventoryMovement.create({
      productId: item.productId,
      variantSku: item.variantSku.toUpperCase(),
      quantityChange: item.quantity,
      previousStock,
      newStock,
      reason,
      orderId: order._id,
      note: `Restored from Order ${order.orderNumber} (${reason})`
    });
  }

  return true;
};
