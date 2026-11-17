import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { connectDB, disconnectDB } from '../config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function inspectOrders() {
  console.log('Connecting to MongoDB Atlas...');
  await connectDB();
  console.log('✅ Connected.\n');

  try {
    // 1. Fetch all orders sorted by createdAt descending
    const allOrders = await Order.find().sort({ createdAt: -1 }).lean();
    console.log(`Total Orders in Database: ${allOrders.length}`);
    allOrders.forEach(o => {
      console.log(`- Order: ${o.orderNumber} | Total: ₹${o.total} | OrderStatus: ${o.orderStatus} | PaymentStatus: ${o.paymentStatus} | Method: ${o.paymentMethod} | Date: ${o.createdAt}`);
    });

    // 2. Find the ₹4,247 order
    const order4247 = allOrders.find(o => o.total === 4247 || Math.abs(o.total - 4247) < 1);
    console.log('\n======================================================');
    console.log('1 & 2. LATEST ₹4,247 ORDER DETAILS:');
    console.log('======================================================');
    if (order4247) {
      console.log(JSON.stringify({
        _id: order4247._id,
        orderNumber: order4247.orderNumber,
        userId: order4247.userId,
        total: order4247.total,
        subtotal: order4247.subtotal,
        discount: order4247.discount,
        shippingFee: order4247.shippingFee,
        orderStatus: order4247.orderStatus,
        paymentStatus: order4247.paymentStatus,
        paymentMethod: order4247.paymentMethod,
        items: order4247.items.map(i => ({ sku: i.variantSku, name: i.name, size: i.size, qty: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
        statusTimeline: order4247.statusTimeline,
        createdAt: order4247.createdAt
      }, null, 2));

      // 3. Payment record for ₹4,247 order
      console.log('\n======================================================');
      console.log('3. CORRESPONDING PAYMENT RECORD:');
      console.log('======================================================');
      const payments4247 = await Payment.find({ orderId: order4247._id }).lean();
      console.log(`Payment records count for this order: ${payments4247.length}`);
      payments4247.forEach(p => console.log(JSON.stringify(p, null, 2)));

      // 4. Inventory check for ₹4,247 order items
      console.log('\n======================================================');
      console.log('4. INVENTORY MOVEMENTS FOR ₹4,247 ORDER:');
      console.log('======================================================');
      const movements4247 = await InventoryMovement.find({
        $or: [
          { orderId: order4247._id },
          { reason: { $regex: order4247.orderNumber, $options: 'i' } }
        ]
      }).lean();
      console.log(`InventoryMovements for order ${order4247.orderNumber}: ${movements4247.length}`);
      movements4247.forEach(m => console.log(JSON.stringify(m, null, 2)));

      // Check current product variants stock
      for (const item of order4247.items) {
        const prod = await Product.findById(item.productId).lean();
        const v = prod?.variants?.find(variant => variant.sku === item.variantSku);
        console.log(`Product "${prod?.name}" SKU: ${item.variantSku} -> Current Stock: ${v?.stockQuantity}`);
      }
    } else {
      console.log('⚠️ No order found matching total ₹4,247 exactly. Listing all orders around 4000:');
      const near = allOrders.filter(o => o.total > 4000 && o.total < 4500);
      near.forEach(o => console.log(o));
    }

    // 5. Investigate ₹2,748 order
    console.log('\n======================================================');
    console.log('5. INVESTIGATION OF ₹2,748 ORDER:');
    console.log('======================================================');
    const order2748 = allOrders.find(o => o.total === 2748 || Math.abs(o.total - 2748) < 1);
    if (order2748) {
      console.log(JSON.stringify({
        _id: order2748._id,
        orderNumber: order2748.orderNumber,
        userId: order2748.userId,
        total: order2748.total,
        subtotal: order2748.subtotal,
        discount: order2748.discount,
        shippingFee: order2748.shippingFee,
        orderStatus: order2748.orderStatus,
        paymentStatus: order2748.paymentStatus,
        paymentMethod: order2748.paymentMethod,
        items: order2748.items.map(i => ({ sku: i.variantSku, name: i.name, size: i.size, qty: i.quantity, unitPrice: i.unitPrice, lineTotal: i.lineTotal })),
        statusTimeline: order2748.statusTimeline,
        createdAt: order2748.createdAt
      }, null, 2));

      const payments2748 = await Payment.find({ orderId: order2748._id }).lean();
      console.log(`Payment records count for ₹2,748 order: ${payments2748.length}`);
      payments2748.forEach(p => console.log(JSON.stringify(p, null, 2)));

      const movements2748 = await InventoryMovement.find({
        $or: [
          { orderId: order2748._id },
          { reason: { $regex: order2748.orderNumber, $options: 'i' } }
        ]
      }).lean();
      console.log(`Inventory movements count for ₹2,748 order: ${movements2748.length}`);
      movements2748.forEach(m => console.log(JSON.stringify(m, null, 2)));
    } else {
      console.log('⚠️ No order found matching total ₹2,748 exactly. Listing all orders around 2700:');
      const near = allOrders.filter(o => o.total > 2500 && o.total < 3000);
      near.forEach(o => console.log(o));
    }

    // 6. Check for duplicate payment records or duplicate stock deductions across ALL orders
    console.log('\n======================================================');
    console.log('6. DUPLICATE PAYMENT RECORDS & STOCK DEDUCTION AUDIT:');
    console.log('======================================================');
    const allPayments = await Payment.find().lean();
    console.log(`Total Payment Records in DB: ${allPayments.length}`);

    // Check payment duplicate orderId
    const paymentsByOrder = {};
    for (const p of allPayments) {
      const oId = p.orderId.toString();
      paymentsByOrder[oId] = (paymentsByOrder[oId] || 0) + 1;
    }
    const duplicatePaymentOrders = Object.entries(paymentsByOrder).filter(([_, count]) => count > 1);
    console.log(`Orders with multiple Payment records: ${duplicatePaymentOrders.length}`);
    if (duplicatePaymentOrders.length > 0) {
      console.log('Duplicates found:', duplicatePaymentOrders);
    }

    // Check all inventory movements for duplicate orders
    const allMovements = await InventoryMovement.find({ movementType: 'order_deduction' }).lean();
    const movementsByOrder = {};
    for (const m of allMovements) {
      if (m.orderId) {
        const oId = m.orderId.toString();
        movementsByOrder[oId] = (movementsByOrder[oId] || 0) + 1;
      }
    }
    console.log(`Total 'order_deduction' movements: ${allMovements.length}`);
    console.log('Orders with stock deductions:', movementsByOrder);

  } catch (err) {
    console.error('Error during inspection:', err);
  } finally {
    await disconnectDB();
  }
}

inspectOrders();

