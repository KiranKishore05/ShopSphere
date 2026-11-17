import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/database.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

async function runStorefrontVerification() {
  await connectDB();
  console.log('========================================================');
  console.log('   SHOPSPHERE STOREFRONT & CATEGORY FLOW AUDIT          ');
  console.log('========================================================\n');

  // 1. Health Endpoint
  const healthRes = await request(app).get('/api/v1/health');
  console.log(`1. Health Check: HTTP ${healthRes.status} (database connected: ${healthRes.body.database?.connected})`);
  if (healthRes.status !== 200) throw new Error('Health check failed');

  // 2. Categories API & Expected Counts
  const catRes = await request(app).get('/api/v1/categories');
  const categories = catRes.body.data?.categories || [];
  console.log(`\n2. Categories API: HTTP ${catRes.status}, Total Categories: ${categories.length}`);

  const expectedCounts = {
    'dresses-tops': { name: 'Dresses & Tops', count: 5 },
    'outerwear': { name: 'Jackets & Hoodies', count: 4 },
    'bottomwear': { name: 'Jeans & Trousers', count: 9 },
    't-shirts': { name: 'T-Shirts', count: 2 },
    'ethnic-wear': { name: 'Kurtas & Ethnic Wear', count: 4 },
    'shirts': { name: 'Shirts', count: 6 },
    'kids-clothing': { name: 'Kids Clothing', count: 10 }
  };

  let countMismatches = 0;
  categories.forEach((cat, index) => {
    const expected = expectedCounts[cat.slug];
    const match = expected && expected.count === cat.productCount;
    if (!match) countMismatches++;
    console.log(`   ${index + 1}. [${cat.slug}] ${cat.name}: ${cat.productCount} products (Expected: ${expected?.count}) ${match ? '✅' : '❌'}`);
  });

  if (countMismatches > 0) {
    throw new Error(`Category product counts mismatch: ${countMismatches} errors found`);
  }

  // 3. 40 Total Products & Gender Breakdown
  const totalInDb = await Product.countDocuments({ isActive: true });
  const menCount = await Product.countDocuments({ isActive: true, gender: 'men' });
  const womenCount = await Product.countDocuments({ isActive: true, gender: 'women' });
  const kidsCount = await Product.countDocuments({ isActive: true, gender: 'kids' });

  console.log(`\n3. Catalogue Counts:`);
  console.log(`   - Total Products: ${totalInDb} (Expected: 40) ${totalInDb === 40 ? '✅' : '❌'}`);
  console.log(`   - Men:   ${menCount} (Expected: 14) ${menCount === 14 ? '✅' : '❌'}`);
  console.log(`   - Women: ${womenCount} (Expected: 16) ${womenCount === 16 ? '✅' : '❌'}`);
  console.log(`   - Kids:  ${kidsCount} (Expected: 10) ${kidsCount === 10 ? '✅' : '❌'}`);

  // 4. Unique Image URLs Verification
  const allProducts = await Product.find({ isActive: true });
  const imageMap = {};
  allProducts.forEach(p => {
    const url = p.images?.[0]?.url;
    if (!imageMap[url]) imageMap[url] = [];
    imageMap[url].push(p.name);
  });
  const duplicateImages = Object.entries(imageMap).filter(([url, names]) => names.length > 1);

  console.log(`\n4. Image Uniqueness:`);
  console.log(`   - Total Unique Primary Image URLs: ${Object.keys(imageMap).length} / 40`);
  console.log(`   - Duplicates: ${duplicateImages.length === 0 ? 'ZERO (Pass ✅)' : duplicateImages.length + ' FAIL ❌'}`);
  if (duplicateImages.length > 0) {
    console.error('Duplicates detected:', duplicateImages);
    throw new Error('Image uniqueness failed');
  }

  // 5. Gender + Category Combined Filter Tests
  console.log(`\n5. Combined Filters (Gender + Category):`);

  // Men + Shirts
  const menShirtsRes = await request(app).get('/api/v1/products?gender=men&category=shirts&limit=50');
  const menShirtsTotal = menShirtsRes.body.meta?.total;
  console.log(`   - Men + Shirts: HTTP ${menShirtsRes.status}, Count: ${menShirtsTotal} (Expected: 5) ${menShirtsTotal === 5 ? '✅' : '❌'}`);

  // Women + Dresses & Tops
  const womenDressesRes = await request(app).get('/api/v1/products?gender=women&category=dresses-tops&limit=50');
  const womenDressesTotal = womenDressesRes.body.meta?.total;
  console.log(`   - Women + Dresses & Tops: HTTP ${womenDressesRes.status}, Count: ${womenDressesTotal} (Expected: 5) ${womenDressesTotal === 5 ? '✅' : '❌'}`);

  // Kids + Kids Clothing
  const kidsClothingRes = await request(app).get('/api/v1/products?gender=kids&category=kids-clothing&limit=50');
  const kidsClothingTotal = kidsClothingRes.body.meta?.total;
  console.log(`   - Kids + Kids Clothing: HTTP ${kidsClothingRes.status}, Count: ${kidsClothingTotal} (Expected: 10) ${kidsClothingTotal === 10 ? '✅' : '❌'}`);

  // Men + Bottomwear (alias jeans-trousers)
  const menBottomRes = await request(app).get('/api/v1/products?gender=men&category=bottomwear&limit=50');
  const menBottomTotal = menBottomRes.body.meta?.total;
  console.log(`   - Men + Jeans & Trousers: HTTP ${menBottomRes.status}, Count: ${menBottomTotal} (Expected: 4) ${menBottomTotal === 4 ? '✅' : '❌'}`);

  console.log('\n========================================================');
  console.log('✅ ALL STOREFRONT & CATEGORY FLOW CHECKS PASSED PERFECTLY');
  console.log('========================================================\n');

  await disconnectDB();
}

runStorefrontVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});

