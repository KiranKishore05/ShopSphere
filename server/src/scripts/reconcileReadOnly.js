import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env.test.local
const testEnvPath = path.resolve(__dirname, '../../.env.test.local');
const envConfig = dotenv.parse(fs.readFileSync(testEnvPath));
const testUri = envConfig.TEST_MONGODB_URI;

// Strict Safety Guard
const normalized = testUri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
const parsedUrl = new URL(normalized);
const host = parsedUrl.host.toLowerCase();
const dbName = parsedUrl.pathname.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '');

if (host !== 'shopsphere-test.axblrnw.mongodb.net' || dbName !== 'shopsphere_test') {
  console.error(`⛔ FATAL: Host or DB mismatch! Host: ${host}, DB: ${dbName}`);
  process.exit(1);
}

async function runReconciliation() {
  await mongoose.connect(testUri, { dbName: 'shopsphere_test' });
  const db = mongoose.connection.db;

  console.log('=== 1. ORDERS RECONCILIATION ===');
  const ordersCol = db.collection('orders');

  const id1 = 'SPH-MWSSIFL9-K9N3';
  const id2 = 'SPH-MWSSTC9A-L0OX';
  const baselineId = 'SPH-MWRNC4PN-P350';

  const order1 = await ordersCol.findOne({ orderNumber: id1 });
  const order2 = await ordersCol.findOne({ orderNumber: id2 });
  const baseline = await ordersCol.findOne({ orderNumber: baselineId });

  console.log(`- Order ${id1} exists: ${!!order1}`);
  console.log(`- Order ${id2} exists: ${!!order2}`);
  console.log(`- Baseline Order ${baselineId} exists: ${!!baseline}`);
  if (baseline) {
    console.log(`  Details: Status="${baseline.orderStatus}", PaymentMethod="${baseline.paymentMethod}", PaymentStatus="${baseline.paymentStatus}", Total=${baseline.total}`);
  }

  const allOrders = await ordersCol.find({}).project({ orderNumber: 1, orderStatus: 1, paymentMethod: 1, paymentStatus: 1, total: 1, createdAt: 1 }).toArray();
  console.log(`- Total orders in database: ${allOrders.length}`);
  allOrders.forEach(o => {
    console.log(`  * Order: ${o.orderNumber} | Status: ${o.orderStatus} | Payment: ${o.paymentMethod}/${o.paymentStatus} | Total: ${o.total} | Date: ${o.createdAt}`);
  });

  console.log('\n=== 2. INVENTORY & PRODUCTS ===');
  const productsCol = db.collection('products');
  const linenShirt = await productsCol.findOne({ name: /Classic Pure Linen Shirt/i });
  if (linenShirt) {
    const totalStock = (linenShirt.variants || []).reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
    console.log(`- Product "${linenShirt.name}":`);
    console.log(`  * Total stock across variants: ${totalStock}`);
    console.log(`  * Variants details:`);
    (linenShirt.variants || []).forEach(v => {
      console.log(`    - SKU: ${v.sku} | Size: ${v.size} | Color: ${v.color?.name} | Price: ${v.price} | StockQuantity: ${v.stockQuantity} | Active: ${v.isActive}`);
    });
  } else {
    console.log('- "Classic Pure Linen Shirt": NOT FOUND');
  }

  const totalProducts = await productsCol.countDocuments();
  console.log(`- Total products in database: ${totalProducts}`);

  console.log('\n=== 3. CUSTOMER CART STATE ===');
  const usersCol = db.collection('users');
  const cartsCol = db.collection('carts');

  const customerUser = await usersCol.findOne({ email: 'customer@shopsphere.in' });
  if (customerUser) {
    const customerCart = await cartsCol.findOne({ user: customerUser._id });
    console.log(`- Customer Cart for ${customerUser.email}:`);
    if (customerCart) {
      console.log(`  * Items count: ${customerCart.items ? customerCart.items.length : 0}`);
      console.log(`  * Items: ${JSON.stringify(customerCart.items)}`);
      console.log(`  * Total items: ${customerCart.totalItems || 0}`);
      console.log(`  * Subtotal: ${customerCart.subtotal || 0}`);
    } else {
      console.log('  * No cart document found (empty/clean)');
    }
  }

  console.log('\n=== 4. COUPONS ===');
  const couponsCol = db.collection('coupons');
  const allCoupons = await couponsCol.find({}).toArray();
  console.log(`- Total coupons in database: ${allCoupons.length}`);
  allCoupons.forEach(c => {
    console.log(`  * Code: "${c.code}" | Type: ${c.discountType} | Value: ${c.discountValue}% | Active: ${c.isActive} | UsedCount: ${c.usedCount}/${c.usageLimit}`);
  });

  console.log('\n=== 5. USERS ===');
  const allUsers = await usersCol.find({}).project({ name: 1, email: 1, role: 1, isActive: 1 }).toArray();
  console.log(`- Total users in database: ${allUsers.length}`);
  allUsers.forEach(u => {
    console.log(`  * ${u.name} (${u.email}) | Role: ${u.role} | Active: ${u.isActive}`);
  });

  await mongoose.disconnect();
}

runReconciliation().catch(err => {
  console.error(err);
  process.exit(1);
});
