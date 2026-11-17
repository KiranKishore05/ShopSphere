import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import request from 'supertest';
import app from '../app.js';
import User from '../models/User.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Cart from '../models/Cart.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function verifyPhase4() {
  console.log('========================================================');
  console.log('   SHOPSPHERE PHASE 4: STOREFRONT VERIFICATION SUITE   ');
  console.log('========================================================');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      family: 4
    });
  }
  console.log('✅ Connected to MongoDB Atlas');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -----------------------------------------------------------------
    // 1. PRODUCT SEARCH (TASK 1)
    // -----------------------------------------------------------------
    console.log('\n--- 1. Testing Product Search ---');
    
    // Search by product name
    const searchRes = await request(app).get('/api/v1/products?search=Linen');
    assert(searchRes.status === 200, 'Search by name returns 200');
    assert(searchRes.body.data.products.length > 0, `Search "Linen" returned ${searchRes.body.data.products.length} product(s)`);
    assert(searchRes.body.data.products.some(p => p.name.includes('Linen')), 'Matching product contains "Linen"');

    // Search by category query
    const catSearchRes = await request(app).get('/api/v1/products?search=ethnic');
    assert(catSearchRes.status === 200, 'Search by category query returns 200');
    assert(catSearchRes.body.data.products.length > 0, `Search "ethnic" returned ${catSearchRes.body.data.products.length} product(s)`);

    // Empty search result
    const emptySearchRes = await request(app).get('/api/v1/products?search=NonExistentGarmentXYZ999');
    assert(emptySearchRes.status === 200, 'Empty search returns 200');
    assert(emptySearchRes.body.data.products.length === 0, 'Empty search returns 0 products');

    // -----------------------------------------------------------------
    // 2. PRODUCT LISTING & FILTERING (TASK 2)
    // -----------------------------------------------------------------
    console.log('\n--- 2. Testing Listing, Filters, Sorting & Pagination ---');
    
    // Total catalog count
    const totalCount = await Product.countDocuments({ isActive: true });
    assert(totalCount === 40, `Catalogue contains exactly 40 active products (found ${totalCount})`);

    // Gender filters
    const menRes = await request(app).get('/api/v1/products?gender=men&limit=50');
    const womenRes = await request(app).get('/api/v1/products?gender=women&limit=50');
    const kidsRes = await request(app).get('/api/v1/products?gender=kids&limit=50');
    assert(menRes.body.data.products.length === 14, `Men collection has 14 products (found ${menRes.body.data.products.length})`);
    assert(womenRes.body.data.products.length === 16, `Women collection has 16 products (found ${womenRes.body.data.products.length})`);
    assert(kidsRes.body.data.products.length === 10, `Kids collection has 10 products (found ${kidsRes.body.data.products.length})`);

    // Price range filter
    const priceRes = await request(app).get('/api/v1/products?minPrice=1000&maxPrice=1500&limit=50');
    assert(priceRes.status === 200, 'Price filter returns 200');
    const allInRange = priceRes.body.data.products.every(p => p.priceRange.min >= 1000 && p.priceRange.min <= 1500);
    assert(allInRange, `All returned products within price range ₹1,000 - ₹1,500 (${priceRes.body.data.products.length} found)`);

    // Sorting: price_asc
    const sortAscRes = await request(app).get('/api/v1/products?sort=price_asc&limit=10');
    const ascPrices = sortAscRes.body.data.products.map(p => p.priceRange.min);
    const isSortedAsc = ascPrices.every((val, i, arr) => !i || arr[i - 1] <= val);
    assert(isSortedAsc, `Sort price_asc correctly sorts ascending: [${ascPrices.slice(0, 4).join(', ')}...]`);

    // Sorting: price_desc
    const sortDescRes = await request(app).get('/api/v1/products?sort=price_desc&limit=10');
    const descPrices = sortDescRes.body.data.products.map(p => p.priceRange.min);
    const isSortedDesc = descPrices.every((val, i, arr) => !i || arr[i - 1] >= val);
    assert(isSortedDesc, `Sort price_desc correctly sorts descending: [${descPrices.slice(0, 4).join(', ')}...]`);

    // Pagination
    const page1Res = await request(app).get('/api/v1/products?page=1&limit=12');
    const page2Res = await request(app).get('/api/v1/products?page=2&limit=12');
    assert(page1Res.body.data.products.length === 12, 'Pagination page 1 returns 12 products');
    assert(page2Res.body.data.products.length === 12, 'Pagination page 2 returns 12 products');
    assert(page1Res.body.meta.totalPages === 4, 'Total pages is 4 for 40 products at limit 12');
    assert(page1Res.body.data.products[0]._id !== page2Res.body.data.products[0]._id, 'Page 1 and Page 2 products are distinct');

    // -----------------------------------------------------------------
    // 3. PRODUCT DETAILS & RELATED PRODUCTS (TASK 3)
    // -----------------------------------------------------------------
    console.log('\n--- 3. Testing Product Details & Related Products ---');
    const sampleProduct = await Product.findOne({ slug: 'mens-linen-casual-shirt' }).populate('categoryId');
    assert(Boolean(sampleProduct), 'Found sample product: mens-linen-casual-shirt');

    const detailRes = await request(app).get(`/api/v1/products/${sampleProduct.slug}`);
    assert(detailRes.status === 200, 'Product details endpoint returns 200');
    assert(detailRes.body.data.product.name === sampleProduct.name, 'Product title matches');
    assert(detailRes.body.data.product.variants.length > 0, `Product has ${detailRes.body.data.product.variants.length} variants`);
    assert(Boolean(detailRes.body.data.product.category), 'Product includes populated category');

    // Related products from same category
    const catSlug = sampleProduct.categoryId.slug;
    const relatedRes = await request(app).get(`/api/v1/categories/${catSlug}/products?limit=6`);
    assert(relatedRes.status === 200, `Category products endpoint returns 200 for ${catSlug}`);
    const relatedProducts = relatedRes.body.data.products.filter(p => p._id.toString() !== sampleProduct._id.toString());
    assert(relatedProducts.length > 0, `Found ${relatedProducts.length} related pieces in ${catSlug}`);

    // -----------------------------------------------------------------
    // 4. CUSTOMER AUTHENTICATION (TASK 6)
    // -----------------------------------------------------------------
    console.log('\n--- 4. Testing Customer Authentication ---');
    const customerEmail = process.env.CUSTOMER_EMAIL || 'customer@shopsphere.in';
    const customerPassword = process.env.CUSTOMER_PASSWORD || 'Customer@ShopSphere2026!';

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: customerEmail, password: customerPassword });

    assert(loginRes.status === 200, `Customer login succeeds with 200 for ${customerEmail}`);
    assert(Boolean(loginRes.body.data.user), 'Login returns user object');
    assert(loginRes.body.data.user.role === 'customer', 'User role is customer');

    // Extract auth cookie
    const cookies = loginRes.headers['set-cookie'];
    assert(Boolean(cookies && cookies.length > 0), 'Session auth cookie returned in header');
    const customerCookie = cookies[0];

    // Profile verification
    const profileRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', customerCookie);
    assert(profileRes.status === 200, 'Protected /api/v1/auth/me returns 200 for authenticated customer');
    assert(profileRes.body.data.user.email === customerEmail, 'Profile email matches');

    // Unauthenticated rejection
    const unauthRes = await request(app).get('/api/v1/auth/me');
    assert(unauthRes.status === 401, 'Unauthenticated request to protected route rejected with 401');

    // -----------------------------------------------------------------
    // 5. SHOPPING CART (TASK 4 & TASK 9)
    // -----------------------------------------------------------------
    console.log('\n--- 5. Testing Shopping Cart, Stock Validation & Server Pricing ---');
    
    // Start with a clean cart
    await Cart.deleteOne({ userId: loginRes.body.data.user._id });

    // Pick two variants from the sample product
    const variant1 = sampleProduct.variants[0];
    const variant2 = sampleProduct.variants[1];

    // Add variant 1 to cart
    const add1Res = await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookie)
      .send({
        productId: sampleProduct._id,
        variantSku: variant1.sku,
        quantity: 1
      });
    assert(add1Res.status === 200, `Added variant ${variant1.sku} to cart (HTTP 200)`);
    assert(add1Res.body.data.cart.items.length === 1, 'Cart has 1 item');
    assert(add1Res.body.data.cart.items[0].price === variant1.price, `Server recalculated price matches DB variant price: ₹${variant1.price}`);

    // Add variant 2 of SAME product -> MUST be a separate line item
    const add2Res = await request(app)
      .post('/api/v1/cart/items')
      .set('Cookie', customerCookie)
      .send({
        productId: sampleProduct._id,
        variantSku: variant2.sku,
        quantity: 2
      });
    assert(add2Res.status === 200, `Added second variant ${variant2.sku} to cart (HTTP 200)`);
    assert(add2Res.body.data.cart.items.length === 2, 'Different variants of same product appear as separate items');

    const expectedSubtotal = (variant1.price * 1) + (variant2.price * 2);
    assert(add2Res.body.data.cart.subtotal === expectedSubtotal, `Cart subtotal correctly calculated server-side: ₹${expectedSubtotal}`);

    // Update quantity
    const updateRes = await request(app)
      .patch(`/api/v1/cart/items/${variant1.sku}`)
      .set('Cookie', customerCookie)
      .send({ quantity: 3 });
    assert(updateRes.status === 200, `Updated quantity of ${variant1.sku} to 3 (HTTP 200)`);
    const updatedItem = updateRes.body.data.cart.items.find(i => i.variantSku === variant1.sku);
    assert(updatedItem.quantity === 3, 'Item quantity updated to 3');

    // Negative quantity prevention
    const negRes = await request(app)
      .patch(`/api/v1/cart/items/${variant1.sku}`)
      .set('Cookie', customerCookie)
      .send({ quantity: -1 });
    assert(negRes.status === 400, 'Negative quantity rejected with HTTP 400 (Security)');

    // Exceeding stock quantity
    const excessiveRes = await request(app)
      .patch(`/api/v1/cart/items/${variant1.sku}`)
      .set('Cookie', customerCookie)
      .send({ quantity: 9999 });
    assert(excessiveRes.status === 400, 'Exceeding stock quantity rejected with HTTP 400 (Stock Integrity)');

    // Remove item from cart
    const removeRes = await request(app)
      .delete(`/api/v1/cart/items/${variant1.sku}`)
      .set('Cookie', customerCookie);
    assert(removeRes.status === 200, `Removed item ${variant1.sku} from cart (HTTP 200)`);
    assert(removeRes.body.data.cart.items.length === 1, 'Cart now has 1 item remaining');

    // -----------------------------------------------------------------
    // 6. WISHLIST (TASK 5)
    // -----------------------------------------------------------------
    console.log('\n--- 6. Testing Wishlist Functionality ---');
    
    // Add product to wishlist
    const addWishRes = await request(app)
      .post('/api/v1/wishlist/items')
      .set('Cookie', customerCookie)
      .send({ productId: sampleProduct._id });
    assert(addWishRes.status === 200, `Added ${sampleProduct.name} to wishlist (HTTP 200)`);

    // Get wishlist
    const getWishRes = await request(app)
      .get('/api/v1/wishlist')
      .set('Cookie', customerCookie);
    assert(getWishRes.status === 200, 'Fetch wishlist returns 200');
    assert(getWishRes.body.data.wishlist.some(p => p._id.toString() === sampleProduct._id.toString()), 'Wishlist contains added garment');

    // Remove from wishlist
    const remWishRes = await request(app)
      .delete(`/api/v1/wishlist/items/${sampleProduct._id}`)
      .set('Cookie', customerCookie);
    assert(remWishRes.status === 200, 'Removed garment from wishlist (HTTP 200)');

    // -----------------------------------------------------------------
    // 7. ADDRESS BOOK & PIN CODE VALIDATION (TASK 7)
    // -----------------------------------------------------------------
    console.log('\n--- 7. Testing Delivery Address & Indian PIN Code Validation ---');

    // Add address with 6-digit Indian PIN code
    const addAddrRes = await request(app)
      .post('/api/v1/users/me/addresses')
      .set('Cookie', customerCookie)
      .send({
        fullName: 'Test Customer',
        phone: '+91 9876543210',
        streetAddress: '42 Fashion Avenue, Indiranagar',
        apartment: 'Suite 201',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        country: 'India',
        isDefault: true
      });
    assert(addAddrRes.status === 201, 'Address with valid 6-digit PIN code (560038) created with HTTP 201');
    assert(addAddrRes.body.data.address.postalCode === '560038', 'Saved address postalCode matches 560038');

    // -----------------------------------------------------------------
    // 8. COUPON VALIDATION & CART PREPARATION (TASK 7)
    // -----------------------------------------------------------------
    console.log('\n--- 8. Testing Coupon Application & Order Review Calculation ---');

    // FIRST10 coupon check
    const first10Res = await request(app)
      .post('/api/v1/coupons/apply')
      .set('Cookie', customerCookie)
      .send({ code: 'FIRST10', subtotal: 2000 });
    assert(first10Res.status === 200, 'FIRST10 coupon validated with HTTP 200');
    assert(first10Res.body.data.discountAmount === 200, 'FIRST10 applies 10% discount (₹200 on ₹2,000)');

    // SPHERE30 coupon check
    const sphere30Res = await request(app)
      .post('/api/v1/coupons/apply')
      .set('Cookie', customerCookie)
      .send({ code: 'SPHERE30', subtotal: 2000 });
    assert(sphere30Res.status === 200, 'SPHERE30 coupon validated with HTTP 200');
    assert(sphere30Res.body.data.discountAmount === 600, 'SPHERE30 applies 30% discount (₹600 on ₹2,000)');

    // Invalid coupon
    const invalidCpnRes = await request(app)
      .post('/api/v1/coupons/apply')
      .set('Cookie', customerCookie)
      .send({ code: 'FAKECOUPON99', subtotal: 2000 });
    assert(invalidCpnRes.status === 400 || invalidCpnRes.status === 404, 'Invalid coupon rejected');

    // -----------------------------------------------------------------
    // 9. CLEANUP TEST DATA
    // -----------------------------------------------------------------
    await Cart.deleteOne({ userId: loginRes.body.data.user._id });

    // -----------------------------------------------------------------
    // SUMMARY
    // -----------------------------------------------------------------
    console.log('\n========================================================');
    console.log(`PHASE 4 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error during Phase 4 verification:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

verifyPhase4();
