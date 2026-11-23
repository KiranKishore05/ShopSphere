import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Safety Check: Load server/.env.test.local only
const testEnvPath = path.resolve(__dirname, '../../.env.test.local');
if (!fs.existsSync(testEnvPath)) {
  console.error('⛔ FATAL: server/.env.test.local does not exist!');
  process.exit(1);
}

const envConfig = dotenv.parse(fs.readFileSync(testEnvPath));
const testUri = envConfig.TEST_MONGODB_URI;

if (!testUri) {
  console.error('⛔ FATAL: TEST_MONGODB_URI missing from server/.env.test.local!');
  process.exit(1);
}

// 2. Strict Host & Database Validation
const normalized = testUri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
const parsedUrl = new URL(normalized);
const host = parsedUrl.host.toLowerCase();
const dbName = parsedUrl.pathname.replace(/^\/+/, '').split('?')[0].replace(/\/+$/, '');

if (host !== 'shopsphere-test.axblrnw.mongodb.net' || dbName !== 'shopsphere_test') {
  console.error(`⛔ FATAL: Safety Check Failed! Host: "${host}", Database: "${dbName}"`);
  console.error('Execution strictly aborted to prevent non-test database modification.');
  process.exit(1);
}

console.log('========================================================');
console.log('🛍️ ShopSphere Additive Demo Fashion Catalog Seed Sequence');
console.log('========================================================');
console.log(`[Safety Guard] Active Cluster: ${host}`);
console.log(`[Safety Guard] Target Database: ${dbName}`);
console.log(`[Safety Guard] Mode: ADDITIVE & IDEMPOTENT (Zero data loss)`);

// 3. Category Definitions (Upserted by slug)
const categoriesData = [
  {
    name: 'Shirts',
    slug: 'shirts',
    description: 'Crisp formal oxfords, lightweight linen button-downs, and relaxed casual shirts.',
    image: {
      url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
      altText: 'Tailored Luxury Shirts'
    }
  },
  {
    name: 'T-Shirts',
    slug: 't-shirts',
    description: 'Heavyweight Supima cotton tees, relaxed graphic t-shirts, and textured knitted polos.',
    image: {
      url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
      altText: 'Premium Cotton T-Shirts'
    }
  },
  {
    name: 'Jeans & Trousers',
    slug: 'bottomwear',
    description: 'Selvedge denim, tailored pleated trousers, wide-leg silhouettes, and everyday chinos.',
    image: {
      url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
      altText: 'Tailored Bottomwear'
    }
  },
  {
    name: 'Dresses & Tops',
    slug: 'dresses-tops',
    description: 'Elegant georgette midi dresses, satin draped tops, wrap blouses, and peplum cuts.',
    image: {
      url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
      altText: 'Contemporary Dresses and Tops'
    }
  },
  {
    name: 'Ethnic Wear',
    slug: 'ethnic-wear',
    description: 'Handcrafted Chanderi kurtis, Banarasi silk sarees, Anarkali sets, and festive ensembles.',
    image: {
      url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
      altText: 'Heritage Indian Ethnic Wear'
    }
  },
  {
    name: 'Jackets & Outerwear',
    slug: 'outerwear',
    description: 'Structured wool blazers, minimalist trench coats, Harrington jackets, and fleece hoodies.',
    image: {
      url: '/images/men-editorial.jpg',
      altText: 'Luxury Tailored Outerwear'
    }
  },
  {
    name: 'Kids Clothing',
    slug: 'kids-clothing',
    description: 'Playful graphic tees, breathable checked shirts, smocked frocks, and soft denim.',
    image: {
      url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
      altText: 'Kids Fashion Collection'
    }
  },
  {
    name: 'Accessories',
    slug: 'accessories',
    description: 'Full-grain canvas utility totes, merino wool beanies, and everyday artisan essentials.',
    image: {
      url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
      altText: 'Minimal Accessories'
    }
  }
];

// Helper to construct variants
const createVariants = (baseSku, sizes, colorName, hexCode, price, compareAtPrice, stockPerVariant = 10) => {
  return sizes.map((size) => ({
    sku: `${baseSku}-${size}`,
    size,
    color: {
      name: colorName,
      hexCode
    },
    price,
    compareAtPrice: compareAtPrice || null,
    stockQuantity: stockPerVariant,
    isActive: true
  }));
};

// 4. Products Definitions (39 new products + 1 existing baseline = 40 total)
const newProductsData = [
  // ==========================================
  // MEN (11 new + 1 baseline = 12 total)
  // ==========================================
  {
    name: 'Tailored Crisp Oxford Formal Shirt',
    slug: 'tailored-crisp-oxford-formal-shirt',
    description: 'Impeccably tailored from 100% long-staple Egyptian cotton, featuring a classic semi-spread collar and mother-of-pearl buttons.',
    categorySlug: 'shirts',
    brand: 'ShopSphere Atelier',
    gender: 'men',
    tags: ['formal', 'cotton', 'shirt', 'workwear', 'office'],
    images: [{ url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', altText: 'Tailored Oxford Formal Shirt', isPrimary: true }],
    variants: createVariants('TOFS-BLU', ['S', 'M', 'L', 'XL'], 'Sky Blue', '#7CA1C4', 2299, 2999, 10),
    isFeatured: true
  },
  {
    name: 'Indigo Slub Denim Casual Shirt',
    slug: 'indigo-slub-denim-casual-shirt',
    description: 'Vintage enzyme-washed indigo slub cotton casual shirt with twin chest flap pockets and tonal stitching.',
    categorySlug: 'shirts',
    brand: 'ShopSphere Denim',
    gender: 'men',
    tags: ['casual', 'denim', 'shirt', 'indigo', 'weekend'],
    images: [{ url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', altText: 'Indigo Slub Casual Shirt', isPrimary: true }],
    variants: createVariants('ISCS-IND', ['S', 'M', 'L', 'XL'], 'Indigo Navy', '#1A2332', 1999, 2699, 12),
    isFeatured: false
  },
  {
    name: 'Heavyweight Supima Crewneck T-Shirt',
    slug: 'heavyweight-supima-crewneck-tee',
    description: 'Engineered from 240 GSM organic Supima cotton. Cut in a modern relaxed drape with dense ribbing at the neckline.',
    categorySlug: 't-shirts',
    brand: 'ShopSphere Basics',
    gender: 'men',
    tags: ['t-shirt', 'tee', 'cotton', 'supima', 'minimal'],
    images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', altText: 'Heavyweight Crewneck Tee', isPrimary: true }],
    variants: createVariants('HSCT-CHA', ['S', 'M', 'L', 'XL'], 'Charcoal', '#34302C', 1299, 1699, 15),
    isFeatured: true
  },
  {
    name: 'Selvedge Slim Tapered Denim Jeans',
    slug: 'selvedge-slim-tapered-denim-jeans',
    description: '13.5oz raw Japanese selvedge denim woven on shuttle looms. Finished with custom copper rivets and reinforced belt loops.',
    categorySlug: 'bottomwear',
    brand: 'ShopSphere Denim',
    gender: 'men',
    tags: ['jeans', 'denim', 'selvedge', 'tapered', 'bottomwear'],
    images: [{ url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: 'Selvedge Slim Jeans', isPrimary: true }],
    variants: createVariants('SSTD-DNM', ['30', '32', '34', '36'], 'Dark Indigo', '#161A28', 3499, 4499, 10),
    isFeatured: true
  },
  {
    name: 'Relaxed Double-Pleat Wool Trousers',
    slug: 'relaxed-double-pleat-wool-trousers',
    description: 'Sculptural high-rise trousers crafted from Italian tropical wool blend, featuring deep inward double pleats and clean back welt pockets.',
    categorySlug: 'bottomwear',
    brand: 'ShopSphere Sartorial',
    gender: 'men',
    tags: ['trousers', 'wool', 'pleated', 'tailoring', 'luxury'],
    images: [{ url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80', altText: 'Double Pleat Wool Trousers', isPrimary: true }],
    variants: createVariants('RDPT-GRY', ['30', '32', '34', '36'], 'Charcoal Grey', '#2F2F2F', 3999, 4999, 8),
    isFeatured: false
  },
  {
    name: 'Structured Wool Blend Tailored Blazer',
    slug: 'structured-wool-blend-blazer',
    description: 'Single-breasted two-button blazer woven in a rich twill wool blend. Features soft natural shoulders and notch lapels.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Sartorial',
    gender: 'men',
    tags: ['blazer', 'suit', 'jacket', 'wool', 'formal'],
    images: [{ url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', altText: 'Tailored Wool Blazer', isPrimary: true }],
    variants: createVariants('SWBB-NVY', ['38', '40', '42', '44'], 'Midnight Navy', '#1C2536', 6999, 8999, 6),
    isFeatured: true
  },
  {
    name: 'Minimalist Wool Trench Overcoat',
    slug: 'minimalist-wool-trench-overcoat',
    description: 'A striking winter menswear coat cut from double-faced camel wool with broad storm flap, horn buttons, and fluid raglan sleeve construction.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Atelier',
    gender: 'men',
    tags: ['coat', 'overcoat', 'trench', 'wool', 'winter'],
    images: [{ url: '/images/men-editorial.jpg', altText: 'Minimalist Camel Overcoat', isPrimary: true }],
    variants: createVariants('MWTO-CAM', ['M', 'L', 'XL'], 'Camel', '#C8B293', 8499, 10999, 7),
    isFeatured: true
  },
  {
    name: 'French Terry Raglan Hoodie',
    slug: 'french-terry-raglan-hoodie',
    description: '450 GSM diagonal-loop French terry hoodie with double-layer hood, flatlock seam detailing, and ribbed side gussets.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Atelier',
    gender: 'men',
    tags: ['hoodie', 'sweatshirt', 'casual', 'fleece', 'streetwear'],
    images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', altText: 'French Terry Raglan Hoodie', isPrimary: true }],
    variants: createVariants('FTRH-SGE', ['S', 'M', 'L', 'XL'], 'Botanic Sage', '#788A75', 2799, 3499, 10),
    isFeatured: false
  },
  {
    name: 'Textured Knitted Cotton Polo',
    slug: 'textured-knitted-polo-tshirt',
    description: '14-gauge waffle knitted polo shirt in breathable Peruvian pima cotton with open Johnny collar styling.',
    categorySlug: 't-shirts',
    brand: 'ShopSphere Basics',
    gender: 'men',
    tags: ['polo', 'knitwear', 't-shirt', 'summer', 'smart-casual'],
    images: [{ url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80', altText: 'Textured Knitted Polo', isPrimary: true }],
    variants: createVariants('TKCP-IVR', ['S', 'M', 'L', 'XL'], 'Ivory Cream', '#F7F4EC', 1899, 2499, 9),
    isFeatured: false
  },
  {
    name: 'Classic Straight-Fit Chino Trousers',
    slug: 'classic-straight-fit-chino-trousers',
    description: 'Garment-dyed stretch cotton twill chinos designed for everyday durability with clean horn-look button accents.',
    categorySlug: 'bottomwear',
    brand: 'ShopSphere Basics',
    gender: 'men',
    tags: ['chinos', 'trousers', 'cotton', 'casual', 'everyday'],
    images: [{ url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80', altText: 'Classic Straight Chinos', isPrimary: true }],
    variants: createVariants('CSCT-KHK', ['30', '32', '34', '36'], 'Muted Sand', '#C8B293', 2499, 3199, 10),
    isFeatured: false
  },
  {
    name: 'Suede Minimalist Harrington Jacket',
    slug: 'suede-harrington-utility-jacket',
    description: 'Supple vegan suede outer shell with brass zip closure, elasticated hem, and contrast satin lining.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Atelier',
    gender: 'men',
    tags: ['jacket', 'suede', 'outerwear', 'harrington', 'retro'],
    images: [{ url: 'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?auto=format&fit=crop&w=800&q=80', altText: 'Suede Harrington Jacket', isPrimary: true }],
    variants: createVariants('SMHJ-BRN', ['M', 'L', 'XL'], 'Saddle Tan', '#9E8462', 5999, 7499, 8),
    isFeatured: true
  },

  // ==========================================
  // WOMEN (12 products)
  // ==========================================
  {
    name: 'Tiered Floral Georgette Midi Dress',
    slug: 'tiered-floral-georgette-midi-dress',
    description: 'Flowing multi-tier midi dress cut from airy printed georgette with smocked cuffs, V-neckline, and self-tie fabric waist belt.',
    categorySlug: 'dresses-tops',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['dress', 'floral', 'midi', 'georgette', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', altText: 'Tiered Georgette Midi Dress', isPrimary: true }],
    variants: createVariants('TFGD-GRN', ['XS', 'S', 'M', 'L'], 'Botanic Sage', '#788A75', 3299, 4299, 8),
    isFeatured: true
  },
  {
    name: 'Ribbed Modal Sweetheart Wrap Top',
    slug: 'ribbed-modal-sweetheart-wrap-top',
    description: 'Ultra-soft micro-modal ribbed knit top designed with an elegant sculpted sweetheart neckline and adjustable side wrap tie.',
    categorySlug: 'dresses-tops',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['top', 'modal', 'ribbed', 'wrap', 'casual'],
    images: [{ url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80', altText: 'Sweetheart Wrap Top', isPrimary: true }],
    variants: createVariants('RMSW-SAD', ['XS', 'S', 'M', 'L'], 'Muted Sand', '#C8B293', 1499, 1999, 12),
    isFeatured: false
  },
  {
    name: 'Handcrafted Chanderi Silk Kurti',
    slug: 'handcrafted-chanderi-silk-kurti',
    description: 'Artisanal Chanderi silk straight kurti featuring delicate zari embroidery along the placket and side slit hems. Lined with breathable mulmul.',
    categorySlug: 'ethnic-wear',
    brand: 'ShopSphere Viraasat',
    gender: 'women',
    tags: ['kurti', 'ethnic', 'silk', 'chanderi', 'festive'],
    images: [{ url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', altText: 'Chanderi Silk Kurti', isPrimary: true }],
    variants: createVariants('HCSK-BLU', ['S', 'M', 'L', 'XL'], 'Sky Blue', '#7CA1C4', 2899, 3699, 10),
    isFeatured: true
  },
  {
    name: 'Crisp Oversized Poplin Shirt',
    slug: 'crisp-oversized-poplin-shirt-women',
    description: 'Relaxed boyfriend-fit shirt crafted from crisp organic cotton poplin, featuring dropped shoulder seams and curved stepped hemline.',
    categorySlug: 'shirts',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['shirt', 'poplin', 'oversized', 'white-shirt', 'minimal'],
    images: [{ url: 'https://images.unsplash.com/photo-1598554747436-c9293d6a588f?auto=format&fit=crop&w=800&q=80', altText: 'Oversized Poplin Shirt', isPrimary: true }],
    variants: createVariants('COPS-WHT', ['S', 'M', 'L'], 'Ivory Cream', '#F7F4EC', 1999, 2599, 10),
    isFeatured: false
  },
  {
    name: 'High-Rise Vintage Wide-Leg Jeans',
    slug: 'high-rise-vintage-wide-leg-jeans',
    description: 'Authentic 90s inspired non-stretch denim jeans with a flattering high-waist fit, roomy thighs, and wide floor-sweeping legs.',
    categorySlug: 'bottomwear',
    brand: 'ShopSphere Denim',
    gender: 'women',
    tags: ['jeans', 'wide-leg', 'high-rise', 'denim', 'vintage'],
    images: [{ url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80', altText: 'Wide Leg Denim Jeans', isPrimary: true }],
    variants: createVariants('HRVW-BLU', ['28', '30', '32', '34'], 'Midnight Navy', '#1A2332', 2999, 3799, 9),
    isFeatured: true
  },
  {
    name: 'Tailored Pleated Wide Linen Trousers',
    slug: 'tailored-pleated-wide-linen-trousers',
    description: 'Structured yet fluid high-waisted linen blend trousers with single forward pleats, slanted pockets, and clean blind-stitched hem.',
    categorySlug: 'bottomwear',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['trousers', 'linen', 'pleated', 'wide-leg', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', altText: 'Pleated Linen Trousers', isPrimary: true }],
    variants: createVariants('TPWL-SND', ['28', '30', '32', '34'], 'Camel', '#C8B293', 2799, 3499, 10),
    isFeatured: false
  },
  {
    name: 'Embroidered Anarkali Festive Kurta Set',
    slug: 'embroidered-anarkali-festive-kurta-set',
    description: 'Opulent flared Anarkali ensemble crafted in raw silk with intricate gotapatti work, matching churidar bottoms and organza dupatta.',
    categorySlug: 'ethnic-wear',
    brand: 'ShopSphere Viraasat',
    gender: 'women',
    tags: ['anarkali', 'ethnic', 'festive', 'wedding', 'kurta-set'],
    images: [{ url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', altText: 'Anarkali Festive Set', isPrimary: true }],
    variants: createVariants('EAFS-MRN', ['S', 'M', 'L', 'XL'], 'Saddle Tan', '#9E8462', 4999, 6499, 7),
    isFeatured: true
  },
  {
    name: 'Pure Banarasi Katan Silk Saree',
    slug: 'pure-banarasi-katan-silk-saree',
    description: 'Woven by master weavers in Varanasi, this heritage Katan silk saree features traditional floral jaal motifs in golden antique zari.',
    categorySlug: 'ethnic-wear',
    brand: 'ShopSphere Viraasat',
    gender: 'women',
    tags: ['saree', 'banarasi', 'silk', 'zari', 'heritage'],
    images: [{ url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80', altText: 'Banarasi Katan Silk Saree', isPrimary: true }],
    variants: createVariants('PBKS-RED', ['One Size'], 'Ink Black', '#161513', 7499, 9999, 15),
    isFeatured: true
  },
  {
    name: 'Satin Draped Halter Neck Midi Dress',
    slug: 'satin-draped-halter-neck-midi-dress',
    description: 'Heavy silk-finish satin evening dress with cowl halter neckline, bias-cut silhouette that hugs natural contours, and side slit.',
    categorySlug: 'dresses-tops',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['dress', 'satin', 'halter', 'evening', 'party'],
    images: [{ url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80', altText: 'Satin Halter Midi Dress', isPrimary: true }],
    variants: createVariants('SDHN-BLK', ['XS', 'S', 'M', 'L'], 'Ink Black', '#161513', 3799, 4999, 8),
    isFeatured: false
  },
  {
    name: 'Linen Buttoned Peplum Sleeveless Top',
    slug: 'linen-buttoned-peplum-sleeveless-top',
    description: 'Charming European flax linen sleeveless top with mother-of-pearl front buttons, square neckline, and subtle flared peplum waist.',
    categorySlug: 'dresses-tops',
    brand: 'ShopSphere Femmes',
    gender: 'women',
    tags: ['top', 'linen', 'peplum', 'sleeveless', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80', altText: 'Linen Peplum Top', isPrimary: true }],
    variants: createVariants('LBPT-IVR', ['XS', 'S', 'M', 'L'], 'Ivory Cream', '#F7F4EC', 1699, 2199, 10),
    isFeatured: false
  },
  {
    name: 'Lucknowi Chikankari Embroidered Long Kurti',
    slug: 'lucknowi-chikankari-embroidered-long-kurti',
    description: 'Authentic hand-embroidered georgette kurti in traditional shadow and murri stitch motifs. Includes matching inner slip.',
    categorySlug: 'ethnic-wear',
    brand: 'ShopSphere Viraasat',
    gender: 'women',
    tags: ['kurti', 'chikankari', 'ethnic', 'handcrafted', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1610030469668-93510cb67655?auto=format&fit=crop&w=800&q=80', altText: 'Chikankari Long Kurti', isPrimary: true }],
    variants: createVariants('LCEL-SGE', ['S', 'M', 'L', 'XL'], 'Botanic Sage', '#788A75', 2499, 3299, 9),
    isFeatured: true
  },
  {
    name: 'Kanjivaram Zari Border Silk Saree',
    slug: 'kanjivaram-zari-border-silk-saree',
    description: 'Handwoven mulberry silk saree from Tamil Nadu showcasing temple border patterns, contrast pallu and heavy gold zari brocade work.',
    categorySlug: 'ethnic-wear',
    brand: 'ShopSphere Viraasat',
    gender: 'women',
    tags: ['saree', 'kanjivaram', 'silk', 'temple-border', 'bridal'],
    images: [{ url: 'https://images.unsplash.com/photo-1610030470298-653609804b86?auto=format&fit=crop&w=800&q=80', altText: 'Kanjivaram Silk Saree', isPrimary: true }],
    variants: createVariants('KZBS-BLU', ['One Size'], 'Midnight Navy', '#1A2332', 8999, 11999, 14),
    isFeatured: true
  },

  // ==========================================
  // KIDS (8 products)
  // ==========================================
  {
    name: 'Boys Graphic Dinosaur Cotton T-Shirt',
    slug: 'boys-graphic-dinosaur-cotton-tshirt',
    description: '100% bio-washed combed cotton t-shirt with playful prehistoric screen print and itch-free heat-sealed neck label.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'boys', 't-shirt', 'cotton', 'playwear'],
    images: [{ url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: 'Boys Dinosaur Cotton Tee', isPrimary: true }],
    variants: createVariants('BGDT-SGE', ['28', '30', '32'], 'Botanic Sage', '#788A75', 699, 999, 15),
    isFeatured: true
  },
  {
    name: 'Boys Classic Tartan Checked Cotton Shirt',
    slug: 'boys-classic-tartan-checked-shirt',
    description: 'Smart collared button-down shirt cut from breathable brushed cotton with long sleeves and roll-up button tabs.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'boys', 'shirt', 'checked', 'festive'],
    images: [{ url: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80', altText: 'Boys Tartan Checked Shirt', isPrimary: true }],
    variants: createVariants('BTCS-NVY', ['28', '30', '32'], 'Midnight Navy', '#1A2332', 999, 1399, 12),
    isFeatured: false
  },
  {
    name: 'Girls Tiered Pastel Floral Cotton Dress',
    slug: 'girls-tiered-pastel-floral-cotton-dress',
    description: 'Charming sleeveless cotton dress with ruffled shoulder frills, button-back closure, and twirl-ready flared skirt.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'girls', 'dress', 'floral', 'summer'],
    images: [{ url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80', altText: 'Girls Tiered Floral Dress', isPrimary: true }],
    variants: createVariants('GTPF-IVR', ['28', '30', '32'], 'Ivory Cream', '#F7F4EC', 1299, 1799, 12),
    isFeatured: true
  },
  {
    name: 'Girls Smocked Bodice Party Frock',
    slug: 'girls-smocked-bodice-party-frock',
    description: 'Festive sleeveless party dress with hand-smocked empire bodice, delicate waist tie bow and silky soft cotton lining.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'girls', 'frock', 'party', 'smocked'],
    images: [{ url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80', altText: 'Girls Smocked Party Frock', isPrimary: true }],
    variants: createVariants('GSBP-SND', ['28', '30', '32'], 'Muted Sand', '#C8B293', 1499, 1999, 10),
    isFeatured: false
  },
  {
    name: 'Kids Stretch Denim Slim Jeans',
    slug: 'kids-stretch-denim-slim-jeans',
    description: 'Durable stretch cotton denim jeans tailored with internal adjustable elastic waistband and reinforced knee panels.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'jeans', 'denim', 'bottomwear', 'everyday'],
    images: [{ url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80', altText: 'Kids Stretch Denim Jeans', isPrimary: true }],
    variants: createVariants('KSDS-BLU', ['28', '30', '32'], 'Dark Indigo', '#161A28', 1199, 1599, 14),
    isFeatured: true
  },
  {
    name: 'Boys Colorblocked Cotton Pique Polo',
    slug: 'boys-colorblocked-cotton-pique-polo',
    description: 'Sporty pique-knit polo shirt with contrasting collar and sleeve cuffs, ribbed trims, and durable mother-of-pearl buttons.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'boys', 'polo', 't-shirt', 'casual'],
    images: [{ url: 'https://images.unsplash.com/photo-1471286174890-9c112ffca56a?auto=format&fit=crop&w=800&q=80', altText: 'Boys Colorblocked Polo', isPrimary: true }],
    variants: createVariants('BCCP-NVY', ['28', '30', '32'], 'Midnight Navy', '#1A2332', 849, 1199, 12),
    isFeatured: false
  },
  {
    name: 'Kids Cozy Fleece Two-Piece Jogger Set',
    slug: 'kids-cozy-fleece-jogger-set',
    description: 'Ultra-soft fleece sweatshirt and matching drawstring joggers featuring ribbed cuffs, elastic waist and kangaroo pocket.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'joggers', 'fleece', 'sweatshirt', 'winter'],
    images: [{ url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80', altText: 'Kids Fleece Jogger Set', isPrimary: true }],
    variants: createVariants('KCFJ-CHA', ['28', '30', '32'], 'Charcoal', '#34302C', 1599, 2199, 12),
    isFeatured: false
  },
  {
    name: 'Kids Embroidered Cotton Kurta Pyjama',
    slug: 'kids-embroidered-cotton-kurta-pyjama',
    description: 'Traditional two-piece Indian festive outfit featuring a mandarin collar embroidered kurta paired with comfortable elasticated pyjama bottoms.',
    categorySlug: 'kids-clothing',
    brand: 'ShopSphere Juniors',
    gender: 'kids',
    tags: ['kids', 'kurta', 'ethnic', 'festive', 'traditional'],
    images: [{ url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80', altText: 'Kids Festive Kurta Set', isPrimary: true }],
    variants: createVariants('KECK-CAM', ['28', '30', '32'], 'Camel', '#C8B293', 1799, 2399, 10),
    isFeatured: true
  },

  // ==========================================
  // UNISEX (8 products)
  // ==========================================
  {
    name: 'Oversized Graphic Heavyweight Cotton Tee',
    slug: 'oversized-graphic-heavyweight-cotton-tee',
    description: '280 GSM premium carded cotton boxy t-shirt featuring minimal typography print and dropped shoulder construction.',
    categorySlug: 't-shirts',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['t-shirt', 'oversized', 'streetwear', 'unisex', 'minimal'],
    images: [{ url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80', altText: 'Oversized Heavyweight Tee', isPrimary: true }],
    variants: createVariants('OGHC-BLK', ['S', 'M', 'L', 'XL'], 'Ink Black', '#161513', 1499, 1999, 12),
    isFeatured: true
  },
  {
    name: 'Minimalist Boxy Crewneck Sweatshirt',
    slug: 'minimalist-boxy-crewneck-sweatshirt',
    description: 'Heavyweight organic cotton crewneck sweatshirt with brushed fleece interior and understated ribbed collar and cuffs.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['sweatshirt', 'crewneck', 'unisex', 'fleece', 'basics'],
    images: [{ url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', altText: 'Boxy Crewneck Sweatshirt', isPrimary: true }],
    variants: createVariants('MBCS-OAT', ['S', 'M', 'L', 'XL'], 'Ivory Cream', '#F7F4EC', 2499, 3199, 10),
    isFeatured: true
  },
  {
    name: 'Drop-Shoulder Vintage Washed Hoodie',
    slug: 'drop-shoulder-vintage-washed-hoodie',
    description: 'Pigment-dyed 420 GSM loopback cotton hoodie with double-needle construction and clean seamless kangaroo pocket.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['hoodie', 'vintage', 'washed', 'unisex', 'streetwear'],
    images: [{ url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=800&q=80', altText: 'Vintage Washed Hoodie', isPrimary: true }],
    variants: createVariants('DSVH-SGE', ['S', 'M', 'L', 'XL'], 'Botanic Sage', '#788A75', 2999, 3799, 10),
    isFeatured: false
  },
  {
    name: 'Brushed Fleece Relaxed Fit Pullover',
    slug: 'brushed-fleece-relaxed-fit-pullover',
    description: 'Relaxed quarter-zip fleece pullover with antique brass zipper, stand-up collar, and deep cozy side seam pockets.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['pullover', 'fleece', 'quarter-zip', 'unisex', 'winter'],
    images: [{ url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80', altText: 'Brushed Fleece Pullover', isPrimary: true }],
    variants: createVariants('BFRP-TAN', ['S', 'M', 'L', 'XL'], 'Saddle Tan', '#9E8462', 2299, 2999, 10),
    isFeatured: false
  },
  {
    name: 'Organic Cotton Acid-Wash Boxy Tee',
    slug: 'organic-cotton-acid-wash-boxy-tee',
    description: 'Hand-distressed acid washed streetwear t-shirt with ribbed crewneck, wide sleeves, and raw straight-cut hem.',
    categorySlug: 't-shirts',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['t-shirt', 'acid-wash', 'boxy', 'unisex', 'vintage'],
    images: [{ url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', altText: 'Acid Wash Boxy Tee', isPrimary: true }],
    variants: createVariants('OCAW-CHA', ['S', 'M', 'L', 'XL'], 'Charcoal', '#34302C', 1399, 1899, 12),
    isFeatured: false
  },
  {
    name: 'Relaxed Fit French Terry Zip Hoodie',
    slug: 'relaxed-fit-french-terry-zip-hoodie',
    description: 'Full-zip hoodie cut from premium dense cotton terry with YKK metal dual zipper and deep tailored drawstring hood.',
    categorySlug: 'outerwear',
    brand: 'ShopSphere Unisex',
    gender: 'unisex',
    tags: ['hoodie', 'zip-up', 'french-terry', 'unisex', 'layering'],
    images: [{ url: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=800&q=80', altText: 'French Terry Zip Hoodie', isPrimary: true }],
    variants: createVariants('RFTZ-NVY', ['S', 'M', 'L', 'XL'], 'Midnight Navy', '#1A2332', 3199, 3999, 9),
    isFeatured: true
  },
  {
    name: 'Heavyweight Canvas Everyday Utility Tote',
    slug: 'heavyweight-canvas-everyday-utility-tote',
    description: '18oz raw unbleached cotton duck canvas tote bag with reinforced dual-rivet webbing handles and interior laptop sleeve.',
    categorySlug: 'accessories',
    brand: 'ShopSphere Atelier',
    gender: 'unisex',
    tags: ['tote', 'bag', 'canvas', 'accessories', 'unisex'],
    images: [{ url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80', altText: 'Canvas Everyday Tote', isPrimary: true }],
    variants: createVariants('HCUT-ECR', ['One Size'], 'Ivory Cream', '#F7F4EC', 1199, 1599, 25),
    isFeatured: true
  },
  {
    name: 'Merino Wool Ribbed Beanie',
    slug: 'merino-wool-ribbed-beanie',
    description: '100% extrafine Australian merino wool fisherman beanie featuring a classic 2x2 rib knit and fold-over cuff.',
    categorySlug: 'accessories',
    brand: 'ShopSphere Atelier',
    gender: 'unisex',
    tags: ['beanie', 'hat', 'wool', 'accessories', 'winter'],
    images: [{ url: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=800&q=80', altText: 'Ribbed Merino Beanie', isPrimary: true }],
    variants: createVariants('MWRB-CHA', ['One Size'], 'Ink Black', '#161513', 899, 1299, 25),
    isFeatured: false
  }
];

async function seedCatalog() {
  await mongoose.connect(testUri, { dbName: 'shopsphere_test' });
  console.log('✅ Connected safely to shopsphere_test\n');

  const db = mongoose.connection.db;
  const categoriesCol = db.collection('categories');
  const productsCol = db.collection('products');

  // Verify baseline product exists and preserve it
  const baselineProduct = await productsCol.findOne({ slug: 'classic-pure-linen-shirt' });
  if (baselineProduct) {
    console.log(`🛡️ Preserved Baseline Product: "${baselineProduct.name}" (ID: ${baselineProduct._id})`);
  } else {
    console.warn('⚠️ Notice: Baseline product "classic-pure-linen-shirt" not found in database.');
  }

  // 1. Upsert Categories
  console.log('\n--- 📁 Upserting Categories ---');
  const categoryMap = new Map();

  for (const cat of categoriesData) {
    const existing = await categoriesCol.findOne({ slug: cat.slug });
    if (existing) {
      await categoriesCol.updateOne(
        { _id: existing._id },
        {
          $set: {
            name: cat.name,
            description: cat.description,
            image: cat.image,
            isActive: true,
            updatedAt: new Date()
          }
        }
      );
      categoryMap.set(cat.slug, existing._id);
      console.log(`  ✓ Updated category: "${cat.name}" (${cat.slug}) -> ID: ${existing._id}`);
    } else {
      const newCatDoc = {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        image: cat.image,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const res = await categoriesCol.insertOne(newCatDoc);
      categoryMap.set(cat.slug, res.insertedId);
      console.log(`  + Inserted category: "${cat.name}" (${cat.slug}) -> ID: ${res.insertedId}`);
    }
  }

  // Also map existing 'shirts' category if it exists
  const existingShirts = await categoriesCol.findOne({ slug: 'shirts' });
  if (existingShirts) {
    categoryMap.set('shirts', existingShirts._id);
  }

  // 2. Additive & Idempotent Upsert of Products
  console.log('\n--- 👗 Seeding Products (Idempotent by slug) ---');
  let insertedCount = 0;
  let updatedCount = 0;

  for (const p of newProductsData) {
    const categoryId = categoryMap.get(p.categorySlug);
    if (!categoryId) {
      console.error(`❌ Error: Category ID not found for slug "${p.categorySlug}"! Skipping product "${p.name}".`);
      continue;
    }

    const totalStock = p.variants.reduce((sum, v) => sum + v.stockQuantity, 0);

    const productDoc = {
      name: p.name,
      slug: p.slug,
      description: p.description,
      categoryId,
      brand: p.brand,
      gender: p.gender,
      tags: p.tags,
      images: p.images,
      variants: p.variants,
      isFeatured: p.isFeatured,
      isActive: true,
      totalSalesCount: 0,
      averageRating: 0,
      reviewCount: 0,
      updatedAt: new Date()
    };

    const existingProd = await productsCol.findOne({ slug: p.slug });
    if (existingProd) {
      // Update existing record without modifying baseline orders or references
      await productsCol.updateOne(
        { _id: existingProd._id },
        { $set: productDoc }
      );
      updatedCount++;
    } else {
      // Add new record
      productDoc.createdAt = new Date();
      await productsCol.insertOne(productDoc);
      insertedCount++;
    }
  }

  console.log(`\n🎉 Product Seeding Summary:`);
  console.log(`  - Newly Inserted: ${insertedCount}`);
  console.log(`  - Updated / Preserved: ${updatedCount}`);

  // 3. Verification of Final State
  const totalProducts = await productsCol.countDocuments({ isActive: true });
  const menCount = await productsCol.countDocuments({ gender: 'men', isActive: true });
  const womenCount = await productsCol.countDocuments({ gender: 'women', isActive: true });
  const kidsCount = await productsCol.countDocuments({ gender: 'kids', isActive: true });
  const unisexCount = await productsCol.countDocuments({ gender: 'unisex', isActive: true });

  console.log(`\n📊 Final Verified Active Catalog in shopsphere_test:`);
  console.log(`  - Total Products: ${totalProducts}`);
  console.log(`  - Men:   ${menCount}`);
  console.log(`  - Women: ${womenCount}`);
  console.log(`  - Kids:  ${kidsCount}`);
  console.log(`  - Unisex: ${unisexCount}`);

  // Re-verify Baseline Order SPH-MWRNC4PN-P350
  const ordersCol = db.collection('orders');
  const baselineOrder = await ordersCol.findOne({ orderNumber: 'SPH-MWRNC4PN-P350' });
  console.log(`\n🛡️ Baseline Order "SPH-MWRNC4PN-P350" Intact: ${!!baselineOrder} (Status: ${baselineOrder?.orderStatus})`);

  await mongoose.disconnect();
  console.log('\n📦 Database connection closed safely.');
}

seedCatalog().catch(err => {
  console.error('Fatal error during catalog seeding:', err);
  process.exit(1);
});
