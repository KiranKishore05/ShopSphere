import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/env.js';
import { connectDB, disconnectDB } from '../config/database.js';
import Category from '../models/Category.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Coupon from '../models/Coupon.js';
import { uniqueProductImages } from './update-product-images.js';

/**
 * ShopSphere Development Seed Script
 * - Single-brand, single-seller fashion e-commerce catalogue.
 * - Targets Men, Women, and Kids fashion essentials (₹899 - ₹2,499).
 * - Idempotent upserts: Safe to rerun without duplicating or destroying records.
 * - Seeds development admin and customer accounts.
 * - Seeds active discount coupons (FIRST10, SPHERE30).
 */
const seedData = async () => {
  if (config.NODE_ENV === 'production') {
    console.error('⛔ FATAL: Cannot run development seed script in production environment!');
    process.exit(1);
  }

  console.log('🌱 Starting ShopSphere development seed sequence...');
  await connectDB();

  try {
    // 1. Seed Categories (Upserted by slug)
    const categoriesData = [
      {
        name: 'Shirts',
        slug: 'shirts',
        description: 'Casual linen shirts, crisp cotton formals, and relaxed camp collars.',
        image: {
          url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
          altText: 'Casual and formal shirts'
        },
        isActive: true
      },
      {
        name: 'T-Shirts',
        slug: 't-shirts',
        description: '100% combed cotton crewnecks, textured waffle tees, and minimal polos.',
        image: {
          url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80',
          altText: 'Premium cotton t-shirts'
        },
        isActive: true
      },
      {
        name: 'Jeans & Trousers',
        slug: 'bottomwear',
        description: 'Slim-fit stretch denim, pleated chinos, relaxed linen trousers, and tailored trousers.',
        image: {
          url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80',
          altText: 'Jeans and trousers'
        },
        isActive: true
      },
      {
        name: 'Dresses & Tops',
        slug: 'dresses-tops',
        description: 'Floral tiered midi dresses, wrap dresses, and elegant contemporary tops.',
        image: {
          url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
          altText: 'Dresses and contemporary tops'
        },
        isActive: true
      },
      {
        name: 'Kurtas & Ethnic Wear',
        slug: 'ethnic-wear',
        description: 'Hand-block printed cotton kurtas, festive Nehru jackets, and contemporary ethnic sets.',
        image: {
          url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80',
          altText: 'Ethnic kurtas and festive wear'
        },
        isActive: true
      },
      {
        name: 'Jackets & Hoodies',
        slug: 'outerwear',
        description: 'All-weather denim jackets, heavyweight fleece hoodies, and lightweight layers.',
        image: {
          url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
          altText: 'Denim jackets and hoodies'
        },
        isActive: true
      },
      {
        name: 'Kids Clothing',
        slug: 'kids-clothing',
        description: 'Playful organic cotton tees, comfortable denim joggers, party frocks, and hoodies.',
        image: {
          url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80',
          altText: 'Kids fashion and comfortable playwear'
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

    // 2. 22 Varied Indian Fashion Products (Men, Women, Kids) between ₹899 and ₹2,499
    const productsData = [
      // --- MEN ---
      {
        name: "Men's Linen Casual Shirt",
        slug: "mens-linen-casual-shirt",
        description: "Crafted from breathable 100% French flax linen. Features a relaxed cut, button-down collar, and garment-washed softness.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['shirts', 'linen', 'casual', 'summer', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', altText: "Men's Linen Casual Shirt in Olive Green", isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', altText: "Men's Linen Casual Shirt Detail", isPrimary: false }
        ],
        variants: [
          { sku: 'MSH-LIN-OLV-S', size: 'S', color: { name: 'Olive Green', hexCode: '#556B2F' }, price: 1299, compareAtPrice: 1899, stockQuantity: 25 },
          { sku: 'MSH-LIN-OLV-M', size: 'M', color: { name: 'Olive Green', hexCode: '#556B2F' }, price: 1299, compareAtPrice: 1899, stockQuantity: 35 },
          { sku: 'MSH-LIN-OLV-L', size: 'L', color: { name: 'Olive Green', hexCode: '#556B2F' }, price: 1299, compareAtPrice: 1899, stockQuantity: 30 },
          { sku: 'MSH-LIN-WHT-M', size: 'M', color: { name: 'Crisp White', hexCode: '#FFFFFF' }, price: 1299, compareAtPrice: 1899, stockQuantity: 20 },
          { sku: 'MSH-LIN-WHT-L', size: 'L', color: { name: 'Crisp White', hexCode: '#FFFFFF' }, price: 1299, compareAtPrice: 1899, stockQuantity: 15 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 42,
        totalSalesCount: 128
      },
      {
        name: "Men's Slim Fit Stretch Denim Jeans",
        slug: "mens-slim-fit-stretch-denim-jeans",
        description: "Classic 5-pocket jeans engineered with 98% cotton and 2% elastane for all-day flexibility. Hand-whiskered vintage blue wash.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['jeans', 'denim', 'casual', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Men's Slim Fit Denim Jeans in Dark Indigo", isPrimary: true }
        ],
        variants: [
          { sku: 'MJN-STR-IND-30', size: '30', color: { name: 'Dark Indigo', hexCode: '#1A2A40' }, price: 1599, compareAtPrice: 2299, stockQuantity: 20 },
          { sku: 'MJN-STR-IND-32', size: '32', color: { name: 'Dark Indigo', hexCode: '#1A2A40' }, price: 1599, compareAtPrice: 2299, stockQuantity: 40 },
          { sku: 'MJN-STR-IND-34', size: '34', color: { name: 'Dark Indigo', hexCode: '#1A2A40' }, price: 1599, compareAtPrice: 2299, stockQuantity: 25 },
          { sku: 'MJN-STR-BLK-32', size: '32', color: { name: 'Jet Black', hexCode: '#121212' }, price: 1599, compareAtPrice: 2299, stockQuantity: 20 }
        ],
        isFeatured: true,
        averageRating: 4.7,
        reviewCount: 38,
        totalSalesCount: 96
      },
      {
        name: "Men's Cotton Chino Trousers",
        slug: "mens-cotton-chino-trousers",
        description: "Tailored flat-front chinos crafted from twill cotton with subtle stretch. Suitable for workdays and weekend dinners.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['trousers', 'chinos', 'smart-casual', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80', altText: "Men's Cotton Chino in Khaki Beige", isPrimary: true }
        ],
        variants: [
          { sku: 'MCH-TWL-KHK-30', size: '30', color: { name: 'Khaki Beige', hexCode: '#C3B091' }, price: 1399, compareAtPrice: 1999, stockQuantity: 18 },
          { sku: 'MCH-TWL-KHK-32', size: '32', color: { name: 'Khaki Beige', hexCode: '#C3B091' }, price: 1399, compareAtPrice: 1999, stockQuantity: 30 },
          { sku: 'MCH-TWL-NVY-32', size: '32', color: { name: 'Navy Blue', hexCode: '#000080' }, price: 1399, compareAtPrice: 1999, stockQuantity: 22 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 19,
        totalSalesCount: 64
      },
      {
        name: "Men's Classic Pique Polo T-Shirt",
        slug: "mens-classic-pique-polo-t-shirt",
        description: "Made from 240 GSM organic cotton honeycomb pique knit. Features ribbed collar, 2-button placket, and side split hem.",
        categoryId: categoryMap['t-shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['t-shirts', 'polo', 'casual', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80', altText: "Men's Pique Polo in Charcoal Grey", isPrimary: true }
        ],
        variants: [
          { sku: 'MTS-POL-CHR-M', size: 'M', color: { name: 'Charcoal Grey', hexCode: '#36454F' }, price: 899, compareAtPrice: 1299, stockQuantity: 40 },
          { sku: 'MTS-POL-CHR-L', size: 'L', color: { name: 'Charcoal Grey', hexCode: '#36454F' }, price: 899, compareAtPrice: 1299, stockQuantity: 35 },
          { sku: 'MTS-POL-BUR-L', size: 'L', color: { name: 'Burgundy Wine', hexCode: '#800020' }, price: 899, compareAtPrice: 1299, stockQuantity: 25 }
        ],
        isFeatured: false,
        averageRating: 4.5,
        reviewCount: 29,
        totalSalesCount: 88
      },
      {
        name: "Men's Heavyweight Fleece Hoodie",
        slug: "mens-heavyweight-fleece-hoodie",
        description: "Brushed interior fleece with double-layer hood and kangaroo pocket. Heavy 380 GSM thermal build for cold mornings.",
        categoryId: categoryMap['outerwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['hoodies', 'outerwear', 'fleece', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80', altText: "Men's Fleece Hoodie in Warm Sand", isPrimary: true }
        ],
        variants: [
          { sku: 'MHD-FLC-SND-M', size: 'M', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 1499, compareAtPrice: 2199, stockQuantity: 20 },
          { sku: 'MHD-FLC-SND-L', size: 'L', color: { name: 'Warm Sand', hexCode: '#C8B293' }, price: 1499, compareAtPrice: 2199, stockQuantity: 28 },
          { sku: 'MHD-FLC-BLK-L', size: 'L', color: { name: 'Midnight Black', hexCode: '#111111' }, price: 1499, compareAtPrice: 2199, stockQuantity: 22 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 54,
        totalSalesCount: 140
      },
      {
        name: "Men's Vintage Denim Trucker Jacket",
        slug: "mens-vintage-denim-trucker-jacket",
        description: "Authentic 13oz cotton denim with button-flap chest pockets, brass buttons, and adjustable waist tabs.",
        categoryId: categoryMap['outerwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['jackets', 'outerwear', 'denim', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80', altText: "Men's Denim Jacket in Vintage Wash", isPrimary: true }
        ],
        variants: [
          { sku: 'MJK-DNM-BLU-M', size: 'M', color: { name: 'Vintage Blue', hexCode: '#4682B4' }, price: 2199, compareAtPrice: 3299, stockQuantity: 15 },
          { sku: 'MJK-DNM-BLU-L', size: 'L', color: { name: 'Vintage Blue', hexCode: '#4682B4' }, price: 2199, compareAtPrice: 3299, stockQuantity: 18 },
          { sku: 'MJK-DNM-BLU-XL', size: 'XL', color: { name: 'Vintage Blue', hexCode: '#4682B4' }, price: 2199, compareAtPrice: 3299, stockQuantity: 10 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 31,
        totalSalesCount: 75
      },
      {
        name: "Men's Embroidered Cotton Kurta",
        slug: "mens-embroidered-cotton-kurta",
        description: "Pure slub cotton kurta featuring fine tonal neck embroidery, mandarin collar, and deep side pockets. Festive yet understated.",
        categoryId: categoryMap['ethnic-wear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['ethnic', 'kurta', 'festive', 'cotton', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', altText: "Men's Cotton Kurta in Sage Green", isPrimary: true }
        ],
        variants: [
          { sku: 'MKR-COT-SGE-M', size: 'M', color: { name: 'Botanical Sage', hexCode: '#788A75' }, price: 1499, compareAtPrice: 2199, stockQuantity: 24 },
          { sku: 'MKR-COT-SGE-L', size: 'L', color: { name: 'Botanical Sage', hexCode: '#788A75' }, price: 1499, compareAtPrice: 2199, stockQuantity: 20 },
          { sku: 'MKR-COT-IVR-M', size: 'M', color: { name: 'Ivory Cream', hexCode: '#FDFBF7' }, price: 1499, compareAtPrice: 2199, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 45,
        totalSalesCount: 112
      },
      {
        name: "Men's Relaxed Camp Collar Shirt",
        slug: "mens-relaxed-camp-collar-shirt",
        description: "Cuban open-collar shirt in fluid modal-cotton weave. Designed for warm coastal days and relaxed evenings.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['shirts', 'campcollar', 'resort', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80', altText: "Men's Camp Collar Shirt in Terracotta", isPrimary: true }
        ],
        variants: [
          { sku: 'MSH-CMP-TER-M', size: 'M', color: { name: 'Terracotta', hexCode: '#E2725B' }, price: 1199, compareAtPrice: 1699, stockQuantity: 22 },
          { sku: 'MSH-CMP-TER-L', size: 'L', color: { name: 'Terracotta', hexCode: '#E2725B' }, price: 1199, compareAtPrice: 1699, stockQuantity: 16 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 14,
        totalSalesCount: 48
      },

      // --- WOMEN ---
      {
        name: "Women's Floral Tiered Midi Dress",
        slug: "womens-floral-tiered-midi-dress",
        description: "Soft viscose midi dress featuring a romantic floral print, tiered skirt, gathered waist, and flattering V-neckline.",
        categoryId: categoryMap['dresses-tops'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['dresses', 'floral', 'midi', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', altText: "Women's Floral Tiered Dress in Blush Pink", isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80', altText: "Women's Floral Dress Lookbook", isPrimary: false }
        ],
        variants: [
          { sku: 'WDR-FLR-PNK-S', size: 'S', color: { name: 'Blush Pink', hexCode: '#FFB6C1' }, price: 1699, compareAtPrice: 2499, stockQuantity: 20 },
          { sku: 'WDR-FLR-PNK-M', size: 'M', color: { name: 'Blush Pink', hexCode: '#FFB6C1' }, price: 1699, compareAtPrice: 2499, stockQuantity: 30 },
          { sku: 'WDR-FLR-PNK-L', size: 'L', color: { name: 'Blush Pink', hexCode: '#FFB6C1' }, price: 1699, compareAtPrice: 2499, stockQuantity: 15 },
          { sku: 'WDR-FLR-BLU-M', size: 'M', color: { name: 'Powder Blue', hexCode: '#B0E0E6' }, price: 1699, compareAtPrice: 2499, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 68,
        totalSalesCount: 165
      },
      {
        name: "Women's A-Line Printed Cotton Kurta",
        slug: "womens-a-line-printed-cotton-kurta",
        description: "Handcrafted 100% mulmul cotton kurta with Jaipur-inspired floral motifs, three-quarter sleeves, and lace border detailing.",
        categoryId: categoryMap['ethnic-wear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['ethnic', 'kurta', 'cotton', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80', altText: "Women's A-Line Kurta in Indigo Floral", isPrimary: true }
        ],
        variants: [
          { sku: 'WKR-ALN-IND-S', size: 'S', color: { name: 'Indigo Blue', hexCode: '#1A2A40' }, price: 1299, compareAtPrice: 1899, stockQuantity: 25 },
          { sku: 'WKR-ALN-IND-M', size: 'M', color: { name: 'Indigo Blue', hexCode: '#1A2A40' }, price: 1299, compareAtPrice: 1899, stockQuantity: 35 },
          { sku: 'WKR-ALN-IND-L', size: 'L', color: { name: 'Indigo Blue', hexCode: '#1A2A40' }, price: 1299, compareAtPrice: 1899, stockQuantity: 20 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 52,
        totalSalesCount: 135
      },
      {
        name: "Women's High-Rise Wide-Leg Jeans",
        slug: "womens-high-rise-wide-leg-jeans",
        description: "Vintage-inspired wide-leg silhouette cut from pure non-stretch cotton denim. Features high waist and flattering hip fit.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['jeans', 'wide-leg', 'denim', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1582418702059-97ebafb35d09?auto=format&fit=crop&w=800&q=80', altText: "Women's Wide Leg Jeans in Light Vintage Blue", isPrimary: true }
        ],
        variants: [
          { sku: 'WJN-WDL-BLU-28', size: '28', color: { name: 'Light Vintage', hexCode: '#87CEEB' }, price: 1699, compareAtPrice: 2399, stockQuantity: 15 },
          { sku: 'WJN-WDL-BLU-30', size: '30', color: { name: 'Light Vintage', hexCode: '#87CEEB' }, price: 1699, compareAtPrice: 2399, stockQuantity: 25 },
          { sku: 'WJN-WDL-BLU-32', size: '32', color: { name: 'Light Vintage', hexCode: '#87CEEB' }, price: 1699, compareAtPrice: 2399, stockQuantity: 18 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 33,
        totalSalesCount: 84
      },
      {
        name: "Women's Ribbed Modal Crop Top",
        slug: "womens-ribbed-modal-crop-top",
        description: "Supremely soft modal-cotton blend with fine vertical ribbing, sweetheart neckline, and capped sleeves.",
        categoryId: categoryMap['dresses-tops'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['tops', 'ribbed', 'crop-top', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80', altText: "Women's Ribbed Crop Top in Warm Cream", isPrimary: true }
        ],
        variants: [
          { sku: 'WTP-RBD-CRM-S', size: 'S', color: { name: 'Warm Cream', hexCode: '#FDFBF7' }, price: 899, compareAtPrice: 1299, stockQuantity: 30 },
          { sku: 'WTP-RBD-CRM-M', size: 'M', color: { name: 'Warm Cream', hexCode: '#FDFBF7' }, price: 899, compareAtPrice: 1299, stockQuantity: 40 },
          { sku: 'WTP-RBD-BLK-M', size: 'M', color: { name: 'Charcoal Black', hexCode: '#1A1A1A' }, price: 899, compareAtPrice: 1299, stockQuantity: 25 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 24,
        totalSalesCount: 92
      },
      {
        name: "Women's Oversized Knit Cardigan",
        slug: "womens-oversized-knit-cardigan",
        description: "Cozy chunky knit cardigan featuring tortoise shell buttons, drop shoulders, and slouchy patch pockets.",
        categoryId: categoryMap['outerwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['knitwear', 'cardigan', 'cozy', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80', altText: "Women's Knit Cardigan in Camel Beige", isPrimary: true }
        ],
        variants: [
          { sku: 'WCD-OVS-CAM-S', size: 'S', color: { name: 'Camel Beige', hexCode: '#C8B293' }, price: 1799, compareAtPrice: 2499, stockQuantity: 15 },
          { sku: 'WCD-OVS-CAM-M', size: 'M', color: { name: 'Camel Beige', hexCode: '#C8B293' }, price: 1799, compareAtPrice: 2499, stockQuantity: 20 },
          { sku: 'WCD-OVS-CAM-L', size: 'L', color: { name: 'Camel Beige', hexCode: '#C8B293' }, price: 1799, compareAtPrice: 2499, stockQuantity: 12 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 39,
        totalSalesCount: 104
      },
      {
        name: "Women's Pleated Formal Trousers",
        slug: "womens-pleated-formal-trousers",
        description: "High-waisted double-pleat tailored trousers crafted from poly-viscose suiting fabric. Complete with clean zip fly and slash pockets.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['trousers', 'formal', 'office', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80', altText: "Women's Pleated Trousers in Olive Sage", isPrimary: true }
        ],
        variants: [
          { sku: 'WTR-PLT-SGE-28', size: '28', color: { name: 'Olive Sage', hexCode: '#788A75' }, price: 1499, compareAtPrice: 2199, stockQuantity: 14 },
          { sku: 'WTR-PLT-SGE-30', size: '30', color: { name: 'Olive Sage', hexCode: '#788A75' }, price: 1499, compareAtPrice: 2199, stockQuantity: 22 },
          { sku: 'WTR-PLT-BLK-30', size: '30', color: { name: 'Jet Black', hexCode: '#111111' }, price: 1499, compareAtPrice: 2199, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 21,
        totalSalesCount: 58
      },
      {
        name: "Women's Silk Blend Printed Co-ord Set",
        slug: "womens-silk-blend-printed-co-ord-set",
        description: "Contemporary two-piece co-ord set featuring a mandarin collar tunic and matching relaxed trousers in artful bohemian prints.",
        categoryId: categoryMap['ethnic-wear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['coord', 'ethnic', 'festive', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=800&q=80', altText: "Women's Co-ord Set in Rust Floral", isPrimary: true }
        ],
        variants: [
          { sku: 'WCD-SLK-RST-S', size: 'S', color: { name: 'Rust Red', hexCode: '#B7410E' }, price: 2299, compareAtPrice: 3199, stockQuantity: 12 },
          { sku: 'WCD-SLK-RST-M', size: 'M', color: { name: 'Rust Red', hexCode: '#B7410E' }, price: 2299, compareAtPrice: 3199, stockQuantity: 18 },
          { sku: 'WCD-SLK-RST-L', size: 'L', color: { name: 'Rust Red', hexCode: '#B7410E' }, price: 2299, compareAtPrice: 3199, stockQuantity: 10 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 46,
        totalSalesCount: 110
      },
      {
        name: "Women's Cropped Utility Jacket",
        slug: "womens-cropped-utility-jacket",
        description: "Modern safari jacket with dual chest cargo pockets, drawcord waist, and snap button front in heavy washed cotton canvas.",
        categoryId: categoryMap['outerwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['jackets', 'outerwear', 'utility', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1544441893-675973e31985?auto=format&fit=crop&w=800&q=80', altText: "Women's Utility Jacket in Dusty Sand", isPrimary: true }
        ],
        variants: [
          { sku: 'WJK-UTL-SND-S', size: 'S', color: { name: 'Dusty Sand', hexCode: '#C8B293' }, price: 1999, compareAtPrice: 2799, stockQuantity: 14 },
          { sku: 'WJK-UTL-SND-M', size: 'M', color: { name: 'Dusty Sand', hexCode: '#C8B293' }, price: 1999, compareAtPrice: 2799, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 18,
        totalSalesCount: 44
      },

      // --- KIDS ---
      {
        name: "Kids Cotton Graphic Fleece Hoodie",
        slug: "kids-cotton-graphic-fleece-hoodie",
        description: "Ultra-soft cotton blend hoodie with cozy brushed inner lining, playful mountain graphic, and safe ribbed cuffs.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'hoodie', 'outerwear', 'winter'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Fleece Hoodie in Mustard Yellow", isPrimary: true }
        ],
        variants: [
          { sku: 'KHD-FLC-MST-S', size: 'S', color: { name: 'Mustard Yellow', hexCode: '#E1AD01' }, price: 899, compareAtPrice: 1299, stockQuantity: 30 },
          { sku: 'KHD-FLC-MST-M', size: 'M', color: { name: 'Mustard Yellow', hexCode: '#E1AD01' }, price: 899, compareAtPrice: 1299, stockQuantity: 40 },
          { sku: 'KHD-FLC-MST-L', size: 'L', color: { name: 'Mustard Yellow', hexCode: '#E1AD01' }, price: 899, compareAtPrice: 1299, stockQuantity: 25 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 36,
        totalSalesCount: 115
      },
      {
        name: "Kids Denim Jogger Pants",
        slug: "kids-denim-jogger-pants",
        description: "Soft stretch denim pants with an elasticated waistband, functional drawstring, and ribbed ankle cuffs for active play.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'denim', 'joggers', 'pants'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Denim Joggers in Medium Blue", isPrimary: true }
        ],
        variants: [
          { sku: 'KJN-JOG-BLU-28', size: '28', color: { name: 'Medium Blue', hexCode: '#4682B4' }, price: 999, compareAtPrice: 1499, stockQuantity: 25 },
          { sku: 'KJN-JOG-BLU-30', size: '30', color: { name: 'Medium Blue', hexCode: '#4682B4' }, price: 999, compareAtPrice: 1499, stockQuantity: 30 }
        ],
        isFeatured: true,
        averageRating: 4.7,
        reviewCount: 28,
        totalSalesCount: 82
      },
      {
        name: "Kids Organic Cotton Printed T-Shirt",
        slug: "kids-organic-cotton-printed-t-shirt",
        description: "Hypoallergenic 100% GOTS-certified organic cotton tee with non-toxic water-based woodland animal print.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 't-shirt', 'organic', 'playwear'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Organic Cotton Tee in Sage Green", isPrimary: true }
        ],
        variants: [
          { sku: 'KTS-ORG-SGE-S', size: 'S', color: { name: 'Sage Green', hexCode: '#788A75' }, price: 899, compareAtPrice: 1199, stockQuantity: 35 },
          { sku: 'KTS-ORG-SGE-M', size: 'M', color: { name: 'Sage Green', hexCode: '#788A75' }, price: 899, compareAtPrice: 1199, stockQuantity: 45 }
        ],
        isFeatured: false,
        averageRating: 4.9,
        reviewCount: 40,
        totalSalesCount: 130
      },
      {
        name: "Kids Floral A-Line Party Frock",
        slug: "kids-floral-a-line-party-frock",
        description: "Delightful cotton-sateen frock with delicate flutter sleeves, pastel floral print, and 100% soft cotton inner lining.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'frock', 'dress', 'party'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Floral Party Frock in Rose Peach", isPrimary: true }
        ],
        variants: [
          { sku: 'KDR-FLR-PCH-S', size: 'S', color: { name: 'Rose Peach', hexCode: '#FFDAB9' }, price: 1199, compareAtPrice: 1699, stockQuantity: 20 },
          { sku: 'KDR-FLR-PCH-M', size: 'M', color: { name: 'Rose Peach', hexCode: '#FFDAB9' }, price: 1199, compareAtPrice: 1699, stockQuantity: 25 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 34,
        totalSalesCount: 95
      },
      {
        name: "Kids Festive Cotton Kurta Pyjama Set",
        slug: "kids-festive-cotton-kurta-pyjama-set",
        description: "Charming festive 2-piece set featuring a mandarin collar kurta with golden foil print and comfortable elasticized pyjama.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'ethnic', 'kurta', 'festive'],
        images: [
          { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', altText: "Kids Festive Kurta Set in Royal Blue", isPrimary: true }
        ],
        variants: [
          { sku: 'KKR-FST-BLU-S', size: 'S', color: { name: 'Royal Blue', hexCode: '#4169E1' }, price: 1399, compareAtPrice: 1999, stockQuantity: 18 },
          { sku: 'KKR-FST-BLU-M', size: 'M', color: { name: 'Royal Blue', hexCode: '#4169E1' }, price: 1399, compareAtPrice: 1999, stockQuantity: 24 }
        ],
        isFeatured: false,
        averageRating: 4.8,
        reviewCount: 22,
        totalSalesCount: 65
      },
      {
        name: "Kids Striped Pique Polo Shirt",
        slug: "kids-striped-pique-polo-shirt",
        description: "Classic sporty polo knitted from breathable cotton pique with bold horizontal nautical stripes and ribbed collar.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'polo', 'casual', 't-shirt'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Striped Polo in Red and Navy", isPrimary: true }
        ],
        variants: [
          { sku: 'KTS-POL-NVY-S', size: 'S', color: { name: 'Navy & Red', hexCode: '#000080' }, price: 899, compareAtPrice: 1299, stockQuantity: 25 },
          { sku: 'KTS-POL-NVY-M', size: 'M', color: { name: 'Navy & Red', hexCode: '#000080' }, price: 899, compareAtPrice: 1299, stockQuantity: 30 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 16,
        totalSalesCount: 50
      },

      // ==========================================
      // --- EXPANSION: 18 NEW PRODUCTS (40 TOTAL) ---
      // ==========================================
      // --- MEN (6 New: 14 Total) ---
      {
        name: "Men's Premium Cotton Overshirt",
        slug: "mens-premium-cotton-overshirt",
        description: "Heavyweight 100% twill cotton overshirt designed for transitional layering. Features dual utility chest pockets and a structured boxy fit.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['overshirt', 'shirts', 'cotton', 'layering', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', altText: "Men's Premium Cotton Overshirt in Khaki", isPrimary: true },
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', altText: "Men's Overshirt Pocket Detail", isPrimary: false }
        ],
        variants: [
          { sku: 'M-OVS-KHK-M', size: 'M', color: { name: 'Khaki Tan', hexCode: '#C3B091' }, price: 1499, compareAtPrice: 2199, stockQuantity: 28 },
          { sku: 'M-OVS-KHK-L', size: 'L', color: { name: 'Khaki Tan', hexCode: '#C3B091' }, price: 1499, compareAtPrice: 2199, stockQuantity: 22 },
          { sku: 'M-OVS-OLV-M', size: 'M', color: { name: 'Army Olive', hexCode: '#4B5320' }, price: 1499, compareAtPrice: 2199, stockQuantity: 25 },
          { sku: 'M-OVS-OLV-L', size: 'L', color: { name: 'Army Olive', hexCode: '#4B5320' }, price: 1499, compareAtPrice: 2199, stockQuantity: 20 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 31,
        totalSalesCount: 94
      },
      {
        name: "Men's Relaxed Fit Cargo Pants",
        slug: "mens-relaxed-fit-cargo-pants",
        description: "Modern utility cargo trousers made from durable cotton ripstop with ergonomic knee darts and secure flap cargo pockets.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['cargos', 'bottomwear', 'relaxed', 'utility', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Men's Relaxed Fit Cargo Pants in Olive", isPrimary: true }
        ],
        variants: [
          { sku: 'M-CRG-OLV-30', size: '30', color: { name: 'Olive Green', hexCode: '#556B2F' }, price: 1799, compareAtPrice: 2499, stockQuantity: 18 },
          { sku: 'M-CRG-OLV-32', size: '32', color: { name: 'Olive Green', hexCode: '#556B2F' }, price: 1799, compareAtPrice: 2499, stockQuantity: 30 },
          { sku: 'M-CRG-BLK-32', size: '32', color: { name: 'Matte Black', hexCode: '#1A1A1A' }, price: 1799, compareAtPrice: 2499, stockQuantity: 24 },
          { sku: 'M-CRG-BLK-34', size: '34', color: { name: 'Matte Black', hexCode: '#1A1A1A' }, price: 1799, compareAtPrice: 2499, stockQuantity: 16 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 27,
        totalSalesCount: 78
      },
      {
        name: "Men's Casual Printed Shirt",
        slug: "mens-casual-printed-shirt",
        description: "Contemporary geometric print shirt tailored from lightweight breathable viscose-cotton blend with spread collar and curved hem.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['shirts', 'printed', 'casual', 'resort', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80', altText: "Men's Casual Printed Shirt in Navy Geometric", isPrimary: true }
        ],
        variants: [
          { sku: 'M-PRT-NAV-S', size: 'S', color: { name: 'Navy Print', hexCode: '#000080' }, price: 1199, compareAtPrice: 1799, stockQuantity: 20 },
          { sku: 'M-PRT-NAV-M', size: 'M', color: { name: 'Navy Print', hexCode: '#000080' }, price: 1199, compareAtPrice: 1799, stockQuantity: 35 },
          { sku: 'M-PRT-NAV-L', size: 'L', color: { name: 'Navy Print', hexCode: '#000080' }, price: 1199, compareAtPrice: 1799, stockQuantity: 25 }
        ],
        isFeatured: false,
        averageRating: 4.5,
        reviewCount: 19,
        totalSalesCount: 62
      },
      {
        name: "Men's Textured Knit Polo",
        slug: "mens-textured-knit-polo",
        description: "Elevated open-collar polo crafted in breathable honeycomb knit cotton. Features clean ribbed hems and a tailored silhouette.",
        categoryId: categoryMap['t-shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['polo', 'knitwear', 'textured', 'casual', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=800&q=80', altText: "Men's Textured Knit Polo in Sand Dune", isPrimary: true }
        ],
        variants: [
          { sku: 'M-TKP-SND-M', size: 'M', color: { name: 'Sand Dune', hexCode: '#C2B280' }, price: 1299, compareAtPrice: 1899, stockQuantity: 30 },
          { sku: 'M-TKP-SND-L', size: 'L', color: { name: 'Sand Dune', hexCode: '#C2B280' }, price: 1299, compareAtPrice: 1899, stockQuantity: 25 },
          { sku: 'M-TKP-IVR-M', size: 'M', color: { name: 'Ivory White', hexCode: '#FFFFF0' }, price: 1299, compareAtPrice: 1899, stockQuantity: 22 },
          { sku: 'M-TKP-IVR-L', size: 'L', color: { name: 'Ivory White', hexCode: '#FFFFF0' }, price: 1299, compareAtPrice: 1899, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.7,
        reviewCount: 38,
        totalSalesCount: 112
      },
      {
        name: "Men's Slim Fit Formal Shirt",
        slug: "mens-slim-fit-formal-shirt",
        description: "Sharp poplin shirt woven from 100% two-ply Egyptian cotton with wrinkle-resistant finish and structured cutaway collar.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['shirts', 'formal', 'office', 'slim-fit', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', altText: "Men's Slim Fit Formal Shirt in Crisp White", isPrimary: true }
        ],
        variants: [
          { sku: 'M-FML-WHT-38', size: '38', color: { name: 'Crisp White', hexCode: '#FFFFFF' }, price: 1399, compareAtPrice: 1999, stockQuantity: 25 },
          { sku: 'M-FML-WHT-40', size: '40', color: { name: 'Crisp White', hexCode: '#FFFFFF' }, price: 1399, compareAtPrice: 1999, stockQuantity: 35 },
          { sku: 'M-FML-BLU-40', size: '40', color: { name: 'Sky Blue', hexCode: '#87CEEB' }, price: 1399, compareAtPrice: 1999, stockQuantity: 30 },
          { sku: 'M-FML-BLU-42', size: '42', color: { name: 'Sky Blue', hexCode: '#87CEEB' }, price: 1399, compareAtPrice: 1999, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 23,
        totalSalesCount: 85
      },
      {
        name: "Men's Cotton Casual Shorts",
        slug: "mens-cotton-casual-shorts",
        description: "Tailored 8-inch inseam chino shorts crafted in stretch cotton twill with interior drawstring and zip-fly closure.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'men',
        tags: ['shorts', 'casual', 'summer', 'bottomwear', 'men'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Men's Cotton Casual Shorts in Beige", isPrimary: true }
        ],
        variants: [
          { sku: 'M-SHT-BEI-30', size: '30', color: { name: 'Warm Beige', hexCode: '#F5F5DC' }, price: 899, compareAtPrice: 1399, stockQuantity: 20 },
          { sku: 'M-SHT-BEI-32', size: '32', color: { name: 'Warm Beige', hexCode: '#F5F5DC' }, price: 899, compareAtPrice: 1399, stockQuantity: 28 },
          { sku: 'M-SHT-NAV-32', size: '32', color: { name: 'Deep Navy', hexCode: '#000080' }, price: 899, compareAtPrice: 1399, stockQuantity: 25 },
          { sku: 'M-SHT-NAV-34', size: '34', color: { name: 'Deep Navy', hexCode: '#000080' }, price: 899, compareAtPrice: 1399, stockQuantity: 18 }
        ],
        isFeatured: false,
        averageRating: 4.5,
        reviewCount: 17,
        totalSalesCount: 56
      },

      // --- WOMEN (8 New: 16 Total) ---
      {
        name: "Women's Premium Co-ord Set",
        slug: "womens-premium-co-ord-set",
        description: "Effortless luxury two-piece co-ord set featuring a relaxed notch-collar top and matching wide-leg trousers in breathable textured modal blend.",
        categoryId: categoryMap['dresses-tops'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['co-ord', 'set', 'premium', 'lounge', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', altText: "Women's Premium Co-ord Set in Oatmeal", isPrimary: true }
        ],
        variants: [
          { sku: 'W-CRD-BEI-S', size: 'S', color: { name: 'Oatmeal Beige', hexCode: '#E3DAC9' }, price: 2299, compareAtPrice: 3299, stockQuantity: 16 },
          { sku: 'W-CRD-BEI-M', size: 'M', color: { name: 'Oatmeal Beige', hexCode: '#E3DAC9' }, price: 2299, compareAtPrice: 3299, stockQuantity: 24 },
          { sku: 'W-CRD-BEI-L', size: 'L', color: { name: 'Oatmeal Beige', hexCode: '#E3DAC9' }, price: 2299, compareAtPrice: 3299, stockQuantity: 15 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 46,
        totalSalesCount: 135
      },
      {
        name: "Women's Floral Printed Maxi Dress",
        slug: "womens-floral-printed-maxi-dress",
        description: "Floor-grazing silhouette in fluid georgette fabric featuring delicate floral prints, a flattering V-neckline, and an empire waistline with subtle gathering.",
        categoryId: categoryMap['dresses-tops'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['dress', 'maxi', 'floral', 'summer', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', altText: "Women's Floral Printed Maxi Dress in Blush Rose", isPrimary: true }
        ],
        variants: [
          { sku: 'W-MAX-FLR-XS', size: 'XS', color: { name: 'Blush Rose', hexCode: '#FFB6C1' }, price: 1999, compareAtPrice: 2899, stockQuantity: 12 },
          { sku: 'W-MAX-FLR-S', size: 'S', color: { name: 'Blush Rose', hexCode: '#FFB6C1' }, price: 1999, compareAtPrice: 2899, stockQuantity: 26 },
          { sku: 'W-MAX-FLR-M', size: 'M', color: { name: 'Blush Rose', hexCode: '#FFB6C1' }, price: 1999, compareAtPrice: 2899, stockQuantity: 30 },
          { sku: 'W-MAX-FLR-L', size: 'L', color: { name: 'Blush Rose', hexCode: '#FFB6C1' }, price: 1999, compareAtPrice: 2899, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 52,
        totalSalesCount: 160
      },
      {
        name: "Women's High-Waist Palazzo Pants",
        slug: "womens-high-waist-palazzo-pants",
        description: "Flowing wide-leg palazzos tailored in breathable rayon with an elasticated waistband and discreet slash pockets.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['palazzo', 'bottomwear', 'ethnic-fusion', 'high-waist', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Women's High-Waist Palazzo Pants in Ivory", isPrimary: true }
        ],
        variants: [
          { sku: 'W-PLZ-IVR-S', size: 'S', color: { name: 'Ivory Cream', hexCode: '#FFFFF0' }, price: 1299, compareAtPrice: 1899, stockQuantity: 20 },
          { sku: 'W-PLZ-IVR-M', size: 'M', color: { name: 'Ivory Cream', hexCode: '#FFFFF0' }, price: 1299, compareAtPrice: 1899, stockQuantity: 28 },
          { sku: 'W-PLZ-BLK-M', size: 'M', color: { name: 'Classic Black', hexCode: '#000000' }, price: 1299, compareAtPrice: 1899, stockQuantity: 25 },
          { sku: 'W-PLZ-BLK-L', size: 'L', color: { name: 'Classic Black', hexCode: '#000000' }, price: 1299, compareAtPrice: 1899, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 29,
        totalSalesCount: 88
      },
      {
        name: "Women's Cotton Casual Top",
        slug: "womens-cotton-casual-top",
        description: "Everyday staple square-neck top in soft ribbed pure cotton with subtle puff sleeves and a contoured hemline.",
        categoryId: categoryMap['dresses-tops'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['top', 'cotton', 'casual', 'everyday', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80', altText: "Women's Cotton Casual Top in Pure White", isPrimary: true }
        ],
        variants: [
          { sku: 'W-TOP-WHT-XS', size: 'XS', color: { name: 'Pure White', hexCode: '#FFFFFF' }, price: 899, compareAtPrice: 1399, stockQuantity: 15 },
          { sku: 'W-TOP-WHT-S', size: 'S', color: { name: 'Pure White', hexCode: '#FFFFFF' }, price: 899, compareAtPrice: 1399, stockQuantity: 25 },
          { sku: 'W-TOP-WHT-M', size: 'M', color: { name: 'Pure White', hexCode: '#FFFFFF' }, price: 899, compareAtPrice: 1399, stockQuantity: 30 },
          { sku: 'W-TOP-COR-M', size: 'M', color: { name: 'Warm Coral', hexCode: '#F88379' }, price: 899, compareAtPrice: 1399, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 33,
        totalSalesCount: 95
      },
      {
        name: "Women's Embroidered Straight Kurta",
        slug: "womens-embroidered-straight-kurta",
        description: "Classic straight-fit kurta crafted from Chanderi cotton silk, adorned with intricate Zari neckline embroidery and side slits.",
        categoryId: categoryMap['ethnic-wear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['kurta', 'ethnic', 'festive', 'embroidery', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', altText: "Women's Embroidered Straight Kurta in Deep Maroon", isPrimary: true }
        ],
        variants: [
          { sku: 'W-STR-MRN-S', size: 'S', color: { name: 'Deep Maroon', hexCode: '#800000' }, price: 1499, compareAtPrice: 2299, stockQuantity: 18 },
          { sku: 'W-STR-MRN-M', size: 'M', color: { name: 'Deep Maroon', hexCode: '#800000' }, price: 1499, compareAtPrice: 2299, stockQuantity: 26 },
          { sku: 'W-STR-MRN-L', size: 'L', color: { name: 'Deep Maroon', hexCode: '#800000' }, price: 1499, compareAtPrice: 2299, stockQuantity: 22 },
          { sku: 'W-STR-MRN-XL', size: 'XL', color: { name: 'Deep Maroon', hexCode: '#800000' }, price: 1499, compareAtPrice: 2299, stockQuantity: 14 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 41,
        totalSalesCount: 122
      },
      {
        name: "Women's Pleated Midi Skirt",
        slug: "womens-pleated-midi-skirt",
        description: "Accordion-pleated midi skirt in lightweight metallic satin featuring a stretch waistband and fluid movement for day-to-night styling.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['skirt', 'midi', 'pleated', 'bottomwear', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Women's Pleated Midi Skirt in Sand Beige", isPrimary: true }
        ],
        variants: [
          { sku: 'W-SKT-SND-S', size: 'S', color: { name: 'Sand Beige', hexCode: '#C2B280' }, price: 1399, compareAtPrice: 1999, stockQuantity: 16 },
          { sku: 'W-SKT-SND-M', size: 'M', color: { name: 'Sand Beige', hexCode: '#C2B280' }, price: 1399, compareAtPrice: 1999, stockQuantity: 24 },
          { sku: 'W-SKT-SND-L', size: 'L', color: { name: 'Sand Beige', hexCode: '#C2B280' }, price: 1399, compareAtPrice: 1999, stockQuantity: 18 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 21,
        totalSalesCount: 67
      },
      {
        name: "Women's Relaxed Fit Cargo Pants",
        slug: "womens-relaxed-fit-cargo-pants",
        description: "High-waisted utility cargo trousers in soft cotton twill with elasticated back waist, adjustable hem toggles, and multi-pockets.",
        categoryId: categoryMap['bottomwear'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['cargos', 'bottomwear', 'relaxed', 'streetwear', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1542272604-780c96856592?auto=format&fit=crop&w=800&q=80', altText: "Women's Relaxed Fit Cargo Pants in Khaki", isPrimary: true }
        ],
        variants: [
          { sku: 'W-CRG-KHK-28', size: '28', color: { name: 'Warm Khaki', hexCode: '#C3B091' }, price: 1699, compareAtPrice: 2399, stockQuantity: 18 },
          { sku: 'W-CRG-KHK-30', size: '30', color: { name: 'Warm Khaki', hexCode: '#C3B091' }, price: 1699, compareAtPrice: 2399, stockQuantity: 28 },
          { sku: 'W-CRG-BLK-30', size: '30', color: { name: 'Onyx Black', hexCode: '#111111' }, price: 1699, compareAtPrice: 2399, stockQuantity: 22 },
          { sku: 'W-CRG-BLK-32', size: '32', color: { name: 'Onyx Black', hexCode: '#111111' }, price: 1699, compareAtPrice: 2399, stockQuantity: 15 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 35,
        totalSalesCount: 104
      },
      {
        name: "Women's Premium Casual Shirt",
        slug: "womens-premium-casual-shirt",
        description: "Relaxed drop-shoulder shirt woven from fine organic cotton poplin with clean mother-of-pearl buttons and curved hemline.",
        categoryId: categoryMap['shirts'],
        brand: 'ShopSphere',
        gender: 'women',
        tags: ['shirt', 'casual', 'organic', 'minimal', 'women'],
        images: [
          { url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80', altText: "Women's Premium Casual Shirt in Powder Blue", isPrimary: true }
        ],
        variants: [
          { sku: 'W-PCS-BLU-S', size: 'S', color: { name: 'Powder Blue', hexCode: '#B0E0E6' }, price: 1199, compareAtPrice: 1799, stockQuantity: 20 },
          { sku: 'W-PCS-BLU-M', size: 'M', color: { name: 'Powder Blue', hexCode: '#B0E0E6' }, price: 1199, compareAtPrice: 1799, stockQuantity: 30 },
          { sku: 'W-PCS-WHT-M', size: 'M', color: { name: 'Cloud White', hexCode: '#F8F9FA' }, price: 1199, compareAtPrice: 1799, stockQuantity: 25 },
          { sku: 'W-PCS-WHT-L', size: 'L', color: { name: 'Cloud White', hexCode: '#F8F9FA' }, price: 1199, compareAtPrice: 1799, stockQuantity: 18 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 24,
        totalSalesCount: 71
      },

      // --- KIDS (4 New: 10 Total) ---
      {
        name: "Kids Boys Cotton Shirt and Shorts Set",
        slug: "kids-boys-cotton-shirt-and-shorts-set",
        description: "Coordinated summer outfit including a breathable printed half-sleeve cotton shirt and soft twill shorts with an elasticated drawstring waistband.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'boys', 'co-ord', 'summer', 'set'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Boys Cotton Shirt and Shorts Set in Sunny Yellow", isPrimary: true }
        ],
        variants: [
          { sku: 'K-BSS-YEL-S', size: 'S', color: { name: 'Sunny Yellow', hexCode: '#FFD700' }, price: 1199, compareAtPrice: 1699, stockQuantity: 20 },
          { sku: 'K-BSS-YEL-M', size: 'M', color: { name: 'Sunny Yellow', hexCode: '#FFD700' }, price: 1199, compareAtPrice: 1699, stockQuantity: 28 },
          { sku: 'K-BSS-BLU-M', size: 'M', color: { name: 'Sky Blue', hexCode: '#87CEEB' }, price: 1199, compareAtPrice: 1699, stockQuantity: 25 },
          { sku: 'K-BSS-BLU-L', size: 'L', color: { name: 'Sky Blue', hexCode: '#87CEEB' }, price: 1199, compareAtPrice: 1699, stockQuantity: 18 }
        ],
        isFeatured: true,
        averageRating: 4.8,
        reviewCount: 28,
        totalSalesCount: 82
      },
      {
        name: "Kids Girls Printed Frock",
        slug: "kids-girls-printed-frock",
        description: "Charming flared frock crafted from pure cotton cambric with joyful botanical prints, flutter sleeves, and soft inner cotton lining.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'girls', 'frock', 'dress', 'cotton'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Girls Printed Frock in Candy Pink", isPrimary: true }
        ],
        variants: [
          { sku: 'K-GPF-PNK-XS', size: 'XS', color: { name: 'Candy Pink', hexCode: '#FF69B4' }, price: 1099, compareAtPrice: 1599, stockQuantity: 15 },
          { sku: 'K-GPF-PNK-S', size: 'S', color: { name: 'Candy Pink', hexCode: '#FF69B4' }, price: 1099, compareAtPrice: 1599, stockQuantity: 24 },
          { sku: 'K-GPF-PNK-M', size: 'M', color: { name: 'Candy Pink', hexCode: '#FF69B4' }, price: 1099, compareAtPrice: 1599, stockQuantity: 22 }
        ],
        isFeatured: false,
        averageRating: 4.7,
        reviewCount: 22,
        totalSalesCount: 64
      },
      {
        name: "Kids Cartoon Graphic T-Shirt",
        slug: "kids-cartoon-graphic-t-shirt",
        description: "Super-soft 100% bio-washed cotton crewneck tee featuring durable water-based non-toxic playful cartoon illustrations.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 't-shirt', 'graphic', 'cotton'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Cartoon Graphic T-Shirt in Cobalt Blue", isPrimary: true }
        ],
        variants: [
          { sku: 'K-CGT-BLU-S', size: 'S', color: { name: 'Cobalt Blue', hexCode: '#0047AB' }, price: 899, compareAtPrice: 1299, stockQuantity: 25 },
          { sku: 'K-CGT-BLU-M', size: 'M', color: { name: 'Cobalt Blue', hexCode: '#0047AB' }, price: 899, compareAtPrice: 1299, stockQuantity: 32 },
          { sku: 'K-CGT-YEL-M', size: 'M', color: { name: 'Sunshine Yellow', hexCode: '#FFDB58' }, price: 899, compareAtPrice: 1299, stockQuantity: 20 }
        ],
        isFeatured: false,
        averageRating: 4.6,
        reviewCount: 19,
        totalSalesCount: 58
      },
      {
        name: "Kids Denim Dungaree Set",
        slug: "kids-denim-dungaree-set",
        description: "Versatile washed cotton denim dungarees paired with a soft striped cotton inner t-shirt. Features adjustable metal clasps and multiple pockets.",
        categoryId: categoryMap['kids-clothing'],
        brand: 'ShopSphere Kids',
        gender: 'kids',
        tags: ['kids', 'dungaree', 'denim', 'set', 'playwear'],
        images: [
          { url: 'https://images.unsplash.com/photo-1519238263530-99bdd11df2ea?auto=format&fit=crop&w=800&q=80', altText: "Kids Denim Dungaree Set in Classic Wash", isPrimary: true }
        ],
        variants: [
          { sku: 'K-DDS-DNM-S', size: 'S', color: { name: 'Mid Indigo Wash', hexCode: '#4B6F88' }, price: 1499, compareAtPrice: 2199, stockQuantity: 18 },
          { sku: 'K-DDS-DNM-M', size: 'M', color: { name: 'Mid Indigo Wash', hexCode: '#4B6F88' }, price: 1499, compareAtPrice: 2199, stockQuantity: 25 },
          { sku: 'K-DDS-DNM-L', size: 'L', color: { name: 'Mid Indigo Wash', hexCode: '#4B6F88' }, price: 1499, compareAtPrice: 2199, stockQuantity: 16 }
        ],
        isFeatured: true,
        averageRating: 4.9,
        reviewCount: 30,
        totalSalesCount: 91
      }
    ];

    for (const prod of productsData) {
      if (uniqueProductImages[prod.slug]) {
        prod.images = [
          {
            url: uniqueProductImages[prod.slug].url,
            altText: uniqueProductImages[prod.slug].altText,
            isPrimary: true
          }
        ];
      }
      const savedProd = await Product.findOneAndUpdate(
        { slug: prod.slug },
        prod,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Product synced: ${savedProd.name} (${savedProd.variants.length} variants, ₹${savedProd.variants[0].price})`);
    }

    // 3. Seed Development Accounts (Admin and Customer)
    console.log('\n👤 Seeding Development Accounts...');
    const adminPasswordHash = await bcrypt.hash('Admin@ShopSphere2026!', 10);
    const customerPasswordHash = await bcrypt.hash('Customer@ShopSphere2026!', 10);

    const adminUser = await User.findOneAndUpdate(
      { email: 'admin@shopsphere.in' },
      {
        name: 'ShopSphere Admin',
        email: 'admin@shopsphere.in',
        passwordHash: adminPasswordHash,
        role: 'admin',
        phone: '+919876543210',
        isActive: true
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ Admin account synced: ${adminUser.email} (Role: ${adminUser.role})`);

    const customerUser = await User.findOneAndUpdate(
      { email: 'customer@shopsphere.in' },
      {
        name: 'Ananya Sharma',
        email: 'customer@shopsphere.in',
        passwordHash: customerPasswordHash,
        role: 'customer',
        phone: '+919876543211',
        isActive: true,
        savedAddresses: [
          {
            isDefault: true,
            fullName: 'Ananya Sharma',
            phone: '+919876543211',
            streetAddress: 'Flat 402, Lotus Grandeur, Linking Road',
            apartment: 'Opposite National Park',
            city: 'Mumbai',
            state: 'Maharashtra',
            postalCode: '400050',
            country: 'India'
          }
        ]
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  ✓ Customer account synced: ${customerUser.email} (Address: Mumbai 400050)`);

    // 4. Seed Development Discount Coupons
    console.log('\n🎟️ Seeding Development Coupons...');
    const couponsData = [
      {
        code: 'FIRST10',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 999,
        maxDiscountAmount: 300,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        usageLimit: 1000,
        perUserLimit: 1,
        isActive: true
      },
      {
        code: 'SPHERE30',
        discountType: 'percentage',
        discountValue: 30,
        minOrderAmount: 1499,
        maxDiscountAmount: 1000,
        startDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        usageLimit: 500,
        perUserLimit: 2,
        isActive: true
      }
    ];

    for (const coup of couponsData) {
      const savedCoupon = await Coupon.findOneAndUpdate(
        { code: coup.code },
        coup,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  ✓ Coupon synced: ${savedCoupon.code} (${savedCoupon.discountValue}% OFF, Min ₹${savedCoupon.minOrderAmount})`);
    }

    console.log('\n✅ ShopSphere Phase 3 Seed sequence completed successfully!');
    console.log(`   Total Categories: ${Object.keys(categoryMap).length}`);
    console.log(`   Total Products:   ${productsData.length}`);
    console.log(`   Accounts:         admin@shopsphere.in, customer@shopsphere.in`);
    console.log(`   Coupons:          FIRST10, SPHERE30\n`);
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
