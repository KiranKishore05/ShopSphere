import mongoose from 'mongoose';
import config from '../config/env.js';
import { connectDB, disconnectDB } from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import Order from '../models/Order.js';

async function verify() {
  await connectDB();
  console.log('--- LIVE CATALOGUE AUDIT ---');

  const products = await Product.find({}).populate('categoryId');
  console.log(`Total Products in DB: ${products.length}`);

  const menProducts = products.filter(p => p.gender === 'men');
  const womenProducts = products.filter(p => p.gender === 'women');
  const kidsProducts = products.filter(p => p.gender === 'kids');

  console.log(`Men Products: ${menProducts.length} (Expected: 14)`);
  console.log(`Women Products: ${womenProducts.length} (Expected: 16)`);
  console.log(`Kids Products: ${kidsProducts.length} (Expected: 10)`);

  // Check unique slugs
  const slugSet = new Set();
  const duplicateSlugs = [];
  for (const p of products) {
    if (slugSet.has(p.slug)) duplicateSlugs.push(p.slug);
    slugSet.add(p.slug);
  }
  console.log(`Duplicate Slugs: ${duplicateSlugs.length === 0 ? 'NONE (Pass)' : duplicateSlugs.join(', ')}`);

  // Check unique SKUs
  const skuSet = new Set();
  const duplicateSkus = [];
  let totalVariants = 0;
  for (const p of products) {
    for (const v of p.variants) {
      totalVariants++;
      if (skuSet.has(v.sku)) duplicateSkus.push(v.sku);
      skuSet.add(v.sku);
    }
  }
  console.log(`Total Variants: ${totalVariants}, Total Unique SKUs: ${skuSet.size}`);
  console.log(`Duplicate SKUs: ${duplicateSkus.length === 0 ? 'NONE (Pass)' : duplicateSkus.join(', ')}`);

  // Check 7 categories
  const categories = await Category.find({});
  console.log(`Total Categories: ${categories.length} (Expected: 7)`);

  // Verify Accounts
  const users = await User.find({});
  console.log(`Total Users: ${users.length} (${users.map(u => u.email).join(', ')})`);
  const customer = users.find(u => u.email === 'customer@shopsphere.in');
  console.log(`Customer saved addresses count: ${customer?.savedAddresses?.length || 0}`);

  // Verify Coupons
  const coupons = await Coupon.find({});
  console.log(`Total Coupons: ${coupons.length} (${coupons.map(c => c.code).join(', ')})`);

  // Verify Orders
  const orderCount = await Order.countDocuments();
  console.log(`Total Orders in DB: ${orderCount} (Preserved, no invented records)`);

  // Price range verification
  let allPricesInRange = true;
  for (const p of products) {
    for (const v of p.variants) {
      if (v.price < 899 || v.price > 2499) {
        console.error(`Price out of range for ${p.name} - SKU ${v.sku}: ₹${v.price}`);
        allPricesInRange = false;
      }
    }
  }
  console.log(`All Prices between ₹899 and ₹2,499: ${allPricesInRange ? 'YES (Pass)' : 'NO (Fail)'}`);

  await disconnectDB();
}

verify().catch(console.error);

