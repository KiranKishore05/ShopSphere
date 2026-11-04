import mongoose from 'mongoose';
import config from '../config/env.js';
import { connectDB, disconnectDB } from '../config/database.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';

const seedData = async () => {
  // Safety check: Never execute seed script in production
  if (config.NODE_ENV === 'production') {
    console.error('⛔ FATAL: Cannot run development seed script in production environment!');
    process.exit(1);
  }

  console.log('🌱 Starting ShopSphere development seed sequence...');
  await connectDB();

  try {
    // 1. Seed Categories (Upserted by slug to ensure idempotency)
    const categoriesData = [
      {
        name: 'Outerwear',
        slug: 'outerwear',
        description: 'Architectural trench coats, double-breasted overcoats, and structured wool tailoring.',
        image: {
          url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=900&q=80',
          altText: 'Tailored Luxury Outerwear'
        },
        isActive: true
      },
      {
        name: 'Knitwear',
        slug: 'knitwear',
        description: '7-gauge Mongolian cashmere, brushed alpaca, and heavy ribbed wool knits.',
        image: {
          url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=900&q=80',
          altText: 'Tactile Mongolian Cashmere Knitwear'
        },
        isActive: true
      },
      {
        name: 'Tailoring',
        slug: 'tailoring',
        description: 'Fluid pleated trousers, relaxed double-pleat silhouettes, and soft blazers.',
        image: {
          url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=80',
          altText: 'Bespoke Modern Tailoring'
        },
        isActive: true
      },
      {
        name: 'Shirting',
        slug: 'shirting',
        description: 'Unstructured silk-linen blends, poplin button-downs, and relaxed camp collars.',
        image: {
          url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=900&q=80',
          altText: 'Pure Silk and Linen Shirting'
        },
        isActive: true
      },
      {
        name: 'Accessories',
        slug: 'accessories',
        description: 'Full-grain Italian vegetable-tanned leather goods, sculptural bags, and belts.',
        image: {
          url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=900&q=80',
          altText: 'Minimal Leather Accessories'
        },
        isActive: true
      }
    ];

    const categoryMap = {};
    for (const cat of categoriesData) {
      const savedCat = await Category.findOneAndUpdate(
        { slug: cat.slug },
        cat,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      categoryMap[cat.slug] = savedCat._id;
      console.log(`  ✓ Category synced: ${savedCat.name}`);
    }

    // 2. 12 Varied Fashion Products for rich catalog filtering, search, and pagination
    const productsData = [
      {
        name: 'Double-Faced Cashmere Trench Coat',
        slug: 'double-faced-cashmere-trench-coat',
        description: 'Crafted from pure unbleached Mongolian cashmere with hand-finished edges, a dramatic sweeping lapel, and a self-tie horn buckle belt.',
        categoryId: categoryMap['outerwear'],
        brand: 'Atelier Sphere',
        gender: 'unisex',
        tags: ['outerwear', 'cashmere', 'coat', 'winter26', 'limited'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80',
            altText: 'Double-Faced Cashmere Trench Coat in Camel',
            isPrimary: true
          },
          {
            url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
            altText: 'Lookbook model wearing Cashmere Trench Coat',
            isPrimary: false
          }
        ],
        variants: [
          { sku: 'COAT-CSH-CAM-S', size: 'S', color: { name: 'Camel', hexCode: '#C8B293' }, price: 18999, compareAtPrice: 24999, stockQuantity: 12 },
          { sku: 'COAT-CSH-CAM-M', size: 'M', color: { name: 'Camel', hexCode: '#C8B293' }, price: 18999, compareAtPrice: 24999, stockQuantity: 18 },
          { sku: 'COAT-CSH-CAM-L', size: 'L', color: { name: 'Camel', hexCode: '#C8B293' }, price: 18999, compareAtPrice: 24999, stockQuantity: 10 },
          { sku: 'COAT-CSH-BLK-M', size: 'M', color: { name: 'Ink Black', hexCode: '#161513' }, price: 18999, compareAtPrice: 24999, stockQuantity: 8 },
          { sku: 'COAT-CSH-BLK-L', size: 'L', color: { name: 'Ink Black', hexCode: '#161513' }, price: 18999, compareAtPrice: 24999, stockQuantity: 5 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 16,
        totalSalesCount: 42
      },
      {
        name: 'Ribbed Alpaca Mockneck Sweater',
        slug: 'ribbed-alpaca-mockneck-sweater',
        description: 'Spun from royal baby alpaca blend, offering extraordinary thermal insulation and a lightweight, cloud-like handfeel.',
        categoryId: categoryMap['knitwear'],
        brand: 'Atelier Sphere',
        gender: 'women',
        tags: ['knitwear', 'alpaca', 'mockneck', 'autumn26'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
            altText: 'Ribbed Alpaca Mockneck in Ivory Cream',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'KNIT-ALP-IVR-XS', size: 'XS', color: { name: 'Ivory Cream', hexCode: '#F7F4EC' }, price: 8499, compareAtPrice: null, stockQuantity: 14 },
          { sku: 'KNIT-ALP-IVR-S', size: 'S', color: { name: 'Ivory Cream', hexCode: '#F7F4EC' }, price: 8499, compareAtPrice: null, stockQuantity: 20 },
          { sku: 'KNIT-ALP-IVR-M', size: 'M', color: { name: 'Ivory Cream', hexCode: '#F7F4EC' }, price: 8499, compareAtPrice: null, stockQuantity: 15 },
          { sku: 'KNIT-ALP-SGE-S', size: 'S', color: { name: 'Botanic Sage', hexCode: '#788A75' }, price: 8499, compareAtPrice: null, stockQuantity: 7 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 9,
        totalSalesCount: 38
      },
      {
        name: 'Relaxed Wide-Leg Wool Trousers',
        slug: 'relaxed-wide-leg-wool-trousers',
        description: 'High-waisted double-pleated trousers cut from Italian high-twist tropical wool. Features deep slash pockets and clean cuff hems.',
        categoryId: categoryMap['tailoring'],
        brand: 'Atelier Sphere',
        gender: 'men',
        tags: ['tailoring', 'trousers', 'wool', 'suiting'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
            altText: 'Relaxed Wide-Leg Wool Trousers in Ink',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'TRS-WLL-BLK-30', size: '30', color: { name: 'Midnight Ink', hexCode: '#161513' }, price: 7999, compareAtPrice: 9999, stockQuantity: 10 },
          { sku: 'TRS-WLL-BLK-32', size: '32', color: { name: 'Midnight Ink', hexCode: '#161513' }, price: 7999, compareAtPrice: 9999, stockQuantity: 16 },
          { sku: 'TRS-WLL-BLK-34', size: '34', color: { name: 'Midnight Ink', hexCode: '#161513' }, price: 7999, compareAtPrice: 9999, stockQuantity: 8 },
          { sku: 'TRS-WLL-SND-32', size: '32', color: { name: 'Muted Sand', hexCode: '#C8B293' }, price: 7999, compareAtPrice: 9999, stockQuantity: 12 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 11,
        totalSalesCount: 29
      },
      {
        name: 'Unstructured Linen-Silk Over-Shirt',
        slug: 'unstructured-linen-silk-over-shirt',
        description: 'A hybrid tailored shirting piece woven with natural linen slub and Mulberry silk, detailed with genuine mother-of-pearl buttons.',
        categoryId: categoryMap['shirting'],
        brand: 'Atelier Sphere',
        gender: 'unisex',
        tags: ['shirting', 'silk', 'linen', 'minimal'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=800&q=80',
            altText: 'Unstructured Linen-Silk Over-Shirt',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'SHT-LNS-SND-S', size: 'S', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 6499, compareAtPrice: null, stockQuantity: 22 },
          { sku: 'SHT-LNS-SND-M', size: 'M', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 6499, compareAtPrice: null, stockQuantity: 18 },
          { sku: 'SHT-LNS-SND-L', size: 'L', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 6499, compareAtPrice: null, stockQuantity: 9 }
        ],
        isFeatured: true,
        averageRating: 4.6,
        reviewCount: 6,
        totalSalesCount: 31
      },
      {
        name: 'Architectural Leather Shopper Tote',
        slug: 'architectural-leather-shopper-tote',
        description: 'Sculpted from thick vegetable-tanned Tuscan saddle leather with hand-burnished raw edges and an unlined suede interior.',
        categoryId: categoryMap['accessories'],
        brand: 'Atelier Sphere Leather',
        gender: 'unisex',
        tags: ['leather', 'tote', 'accessories', 'luxury'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=800&q=80',
            altText: 'Architectural Leather Shopper Tote in Saddle Tan',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'BAG-TOT-TAN-OS', size: 'One Size', color: { name: 'Saddle Tan', hexCode: '#9E8462' }, price: 12499, compareAtPrice: 15999, stockQuantity: 15 },
          { sku: 'BAG-TOT-BLK-OS', size: 'One Size', color: { name: 'Obsidian Black', hexCode: '#161513' }, price: 12499, compareAtPrice: 15999, stockQuantity: 11 }
        ],
        isFeatured: false,
        averageRating: 5.0,
        reviewCount: 4,
        totalSalesCount: 19
      },
      {
        name: 'Structured Wool-Blend Peacoat',
        slug: 'structured-wool-blend-peacoat',
        description: 'A cropped double-breasted maritime peacoat tailored with heavy 32oz Melton wool, welt pockets, and horn naval buttons.',
        categoryId: categoryMap['outerwear'],
        brand: 'Atelier Sphere',
        gender: 'men',
        tags: ['outerwear', 'peacoat', 'wool', 'winter26'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
            altText: 'Structured Wool-Blend Peacoat',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'COAT-PEA-NAV-M', size: 'M', color: { name: 'Midnight Navy', hexCode: '#1A2332' }, price: 14999, compareAtPrice: 18999, stockQuantity: 8 },
          { sku: 'COAT-PEA-NAV-L', size: 'L', color: { name: 'Midnight Navy', hexCode: '#1A2332' }, price: 14999, compareAtPrice: 18999, stockQuantity: 12 },
          { sku: 'COAT-PEA-BLK-M', size: 'M', color: { name: 'Ink Black', hexCode: '#161513' }, price: 14999, compareAtPrice: 18999, stockQuantity: 0 } // Sold out for test
        ],
        isFeatured: false,
        averageRating: 4.8,
        reviewCount: 7,
        totalSalesCount: 22
      },
      {
        name: 'Fine-Gauge Merino Wool Turtleneck',
        slug: 'fine-gauge-merino-wool-turtleneck',
        description: 'Spun from 19.5-micron extrafine Australian Merino wool. Designed for refined layering beneath tailored jackets and overcoats.',
        categoryId: categoryMap['knitwear'],
        brand: 'Atelier Sphere',
        gender: 'women',
        tags: ['knitwear', 'merino', 'turtleneck', 'essentials'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
            altText: 'Fine-Gauge Merino Turtleneck',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'KNIT-MER-BLK-S', size: 'S', color: { name: 'Ink Black', hexCode: '#161513' }, price: 5499, compareAtPrice: 6999, stockQuantity: 25 },
          { sku: 'KNIT-MER-BLK-M', size: 'M', color: { name: 'Ink Black', hexCode: '#161513' }, price: 5499, compareAtPrice: 6999, stockQuantity: 30 },
          { sku: 'KNIT-MER-SGE-S', size: 'S', color: { name: 'Botanic Sage', hexCode: '#788A75' }, price: 5499, compareAtPrice: 6999, stockQuantity: 14 },
          { sku: 'KNIT-MER-SGE-M', size: 'M', color: { name: 'Botanic Sage', hexCode: '#788A75' }, price: 5499, compareAtPrice: 6999, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 21,
        totalSalesCount: 54
      },
      {
        name: 'Single-Breasted Raw Silk Blazer',
        slug: 'single-breasted-raw-silk-blazer',
        description: 'Hand-tailored from textured raw tussar silk featuring soft canvassing, natural shoulder expression, and horn button fastenings.',
        categoryId: categoryMap['tailoring'],
        brand: 'Atelier Sphere',
        gender: 'women',
        tags: ['tailoring', 'blazer', 'silk', 'luxury'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=800&q=80',
            altText: 'Single-Breasted Raw Silk Blazer in Natural Ivory',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'BLZ-SLK-IVR-S', size: 'S', color: { name: 'Natural Ivory', hexCode: '#FDFBF7' }, price: 16499, compareAtPrice: 21999, stockQuantity: 6 },
          { sku: 'BLZ-SLK-IVR-M', size: 'M', color: { name: 'Natural Ivory', hexCode: '#FDFBF7' }, price: 16499, compareAtPrice: 21999, stockQuantity: 8 }
        ],
        isFeatured: false,
        averageRating: 5.0,
        reviewCount: 3,
        totalSalesCount: 15
      },
      {
        name: 'Camp-Collar Tencel Silk Shirt',
        slug: 'camp-collar-tencel-silk-shirt',
        description: 'Fluid drape cut with an open Cuban collar, chest patch pocket, and mother-of-pearl buttons. Crafted from botanical Tencel and silk.',
        categoryId: categoryMap['shirting'],
        brand: 'Atelier Sphere',
        gender: 'men',
        tags: ['shirting', 'campcollar', 'silk', 'tencel'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
            altText: 'Camp-Collar Tencel Silk Shirt in Botanic Sage',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'SHT-CMP-SGE-M', size: 'M', color: { name: 'Botanic Sage', hexCode: '#788A75' }, price: 5999, compareAtPrice: null, stockQuantity: 16 },
          { sku: 'SHT-CMP-SGE-L', size: 'L', color: { name: 'Botanic Sage', hexCode: '#788A75' }, price: 5999, compareAtPrice: null, stockQuantity: 12 },
          { sku: 'SHT-CMP-BLK-M', size: 'M', color: { name: 'Ink Black', hexCode: '#161513' }, price: 5999, compareAtPrice: null, stockQuantity: 14 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 8,
        totalSalesCount: 26
      },
      {
        name: 'Minimalist Leather Crossbody Pouch',
        slug: 'minimalist-leather-crossbody-pouch',
        description: 'Architectural pouch bag designed with an adjustable leather cord strap, concealed magnetic clasp, and hand-waxed finish.',
        categoryId: categoryMap['accessories'],
        brand: 'Atelier Sphere Leather',
        gender: 'unisex',
        tags: ['accessories', 'leather', 'crossbody', 'minimal'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=800&q=80',
            altText: 'Minimalist Leather Crossbody Pouch in Obsidian Black',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'BAG-CRS-BLK-OS', size: 'One Size', color: { name: 'Obsidian Black', hexCode: '#161513' }, price: 6999, compareAtPrice: 8999, stockQuantity: 20 },
          { sku: 'BAG-CRS-SND-OS', size: 'One Size', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 6999, compareAtPrice: 8999, stockQuantity: 15 }
        ],
        isFeatured: false,
        averageRating: 4.8,
        reviewCount: 5,
        totalSalesCount: 18
      },
      {
        name: 'Brushed Cashmere Cocoon Cardigan',
        slug: 'brushed-cashmere-cocoon-cardigan',
        description: 'An enveloping silhouette shaped with drop shoulders, ribbed cuffs, and seamless pockets in heavenly brushed 5-ply cashmere.',
        categoryId: categoryMap['knitwear'],
        brand: 'Atelier Sphere',
        gender: 'women',
        tags: ['knitwear', 'cashmere', 'cardigan', 'cocoon'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=800&q=80',
            altText: 'Brushed Cashmere Cocoon Cardigan in Camel',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'KNIT-CRD-CAM-S', size: 'S', color: { name: 'Camel', hexCode: '#C8B293' }, price: 11999, compareAtPrice: 14999, stockQuantity: 9 },
          { sku: 'KNIT-CRD-CAM-M', size: 'M', color: { name: 'Camel', hexCode: '#C8B293' }, price: 11999, compareAtPrice: 14999, stockQuantity: 14 },
          { sku: 'KNIT-CRD-CAM-L', size: 'L', color: { name: 'Camel', hexCode: '#C8B293' }, price: 11999, compareAtPrice: 14999, stockQuantity: 7 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 12,
        totalSalesCount: 35
      },
      {
        name: 'Tailored Linen Pleated Shorts',
        slug: 'tailored-linen-pleated-shorts',
        description: 'Cut with high waist, deep forward pleats, and extended waistband tab. Woven from 100% Normandy flax linen.',
        categoryId: categoryMap['tailoring'],
        brand: 'Atelier Sphere',
        gender: 'men',
        tags: ['tailoring', 'linen', 'shorts', 'summer'],
        images: [
          {
            url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80',
            altText: 'Tailored Linen Pleated Shorts in Sand',
            isPrimary: true
          }
        ],
        variants: [
          { sku: 'TRS-SHT-SND-30', size: '30', color: { name: 'Muted Sand', hexCode: '#C8B293' }, price: 4999, compareAtPrice: 6499, stockQuantity: 18 },
          { sku: 'TRS-SHT-SND-32', size: '32', color: { name: 'Muted Sand', hexCode: '#C8B293' }, price: 4999, compareAtPrice: 6499, stockQuantity: 24 },
          { sku: 'TRS-SHT-BLK-32', size: '32', color: { name: 'Midnight Ink', hexCode: '#161513' }, price: 4999, compareAtPrice: 6499, stockQuantity: 12 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 5,
        totalSalesCount: 17
      }
    ];

    for (const prod of productsData) {
      const savedProd = await Product.findOneAndUpdate(
        { slug: prod.slug },
        prod,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Product synced: ${savedProd.name} (${savedProd.variants.length} variants)`);
    }

    console.log('✅ Seed sequence finished successfully with zero duplicate records.');
  } catch (seedError) {
    console.error('❌ Error executing seed sequence:', seedError);
    throw seedError;
  } finally {
    await disconnectDB();
  }
};

seedData().catch((err) => {
  console.error(err);
  process.exit(1);
});
