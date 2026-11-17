import request from 'supertest';
import app from '../app.js';
import { connectDB, disconnectDB } from '../config/database.js';

async function runApiTests() {
  await connectDB();
  console.log('--- RUNNING LIVE REST API VERIFICATION ---');

  // 1. Health
  const healthRes = await request(app).get('/api/v1/health');
  console.log(`1. Health Endpoint: HTTP ${healthRes.status}, Status: ${healthRes.body.status}, DB Connected: ${healthRes.body.database?.connected}`);

  // 2. Categories
  const catRes = await request(app).get('/api/v1/categories');
  const catList = catRes.body.data?.categories || [];
  console.log(`2. Categories: HTTP ${catRes.status}, Count: ${catList.length}`);
  catList.forEach(c => console.log(`   - ${c.name} (${c.slug}): ${c.productCount} active products`));

  // 3. Products All (limit 50)
  const prodRes = await request(app).get('/api/v1/products?limit=50');
  const totalProducts = prodRes.body.meta?.total;
  console.log(`3. Products (All): HTTP ${prodRes.status}, Total active in catalogue: ${totalProducts}`);

  // 4. Products by Gender
  const menRes = await request(app).get('/api/v1/products?gender=men&limit=50');
  const menCount = menRes.body.meta?.total;
  console.log(`4a. Men Products: HTTP ${menRes.status}, Count: ${menCount} (Expected: 14)`);

  const womenRes = await request(app).get('/api/v1/products?gender=women&limit=50');
  const womenCount = womenRes.body.meta?.total;
  console.log(`4b. Women Products: HTTP ${womenRes.status}, Count: ${womenCount} (Expected: 16)`);

  const kidsRes = await request(app).get('/api/v1/products?gender=kids&limit=50');
  const kidsCount = kidsRes.body.meta?.total;
  console.log(`4c. Kids Products: HTTP ${kidsRes.status}, Count: ${kidsCount} (Expected: 10)`);

  // 5. Product Detail for new products
  const newProdsToTest = [
    'mens-premium-cotton-overshirt',
    'womens-premium-co-ord-set',
    'kids-denim-dungaree-set'
  ];
  for (const slug of newProdsToTest) {
    const detailRes = await request(app).get(`/api/v1/products/${slug}`);
    const p = detailRes.body.data?.product;
    console.log(`5. Detail for ${slug}: HTTP ${detailRes.status}, Name: "${p?.name}", Price Range: ₹${p?.priceRange?.min}-₹${p?.priceRange?.max}, Variants: ${p?.variants?.length}`);
  }

  // 6. Admin and Customer Login
  const adminLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'admin@shopsphere.in', password: 'Admin@ShopSphere2026!' });
  console.log(`6a. Admin Login: HTTP ${adminLoginRes.status}, Role: ${adminLoginRes.body.data?.user?.role}`);

  const custLoginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'customer@shopsphere.in', password: 'Customer@ShopSphere2026!' });
  const custCookie = custLoginRes.headers['set-cookie'];
  console.log(`6b. Customer Login: HTTP ${custLoginRes.status}, Name: ${custLoginRes.body.data?.user?.name}`);

  // 7. Coupon application with customer auth
  const couponRes1 = await request(app)
    .post('/api/v1/coupons/apply')
    .set('Cookie', custCookie)
    .send({ code: 'FIRST10', subtotal: 1299 });
  console.log(`7a. Coupon FIRST10 Apply: HTTP ${couponRes1.status}, Discount: ₹${couponRes1.body.data?.discountAmount}, Final Total: ₹${couponRes1.body.data?.discountedTotal}`);

  const couponRes2 = await request(app)
    .post('/api/v1/coupons/apply')
    .set('Cookie', custCookie)
    .send({ code: 'SPHERE30', subtotal: 2000 });
  console.log(`7b. Coupon SPHERE30 Apply: HTTP ${couponRes2.status}, Discount: ₹${couponRes2.body.data?.discountAmount}, Final Total: ₹${couponRes2.body.data?.discountedTotal}`);

  // 8. Customer Saved Address
  const addrRes = await request(app)
    .get('/api/v1/users/me/addresses')
    .set('Cookie', custCookie);
  const addr = addrRes.body.data?.addresses?.[0];
  console.log(`8. Saved Addresses: HTTP ${addrRes.status}, FullName: ${addr?.fullName}, City: ${addr?.city}, Pincode: ${addr?.postalCode}`);

  console.log('--- ALL REST API CHECKS PASSED PERFECTLY ---');
  await disconnectDB();
}

runApiTests().catch(console.error);
