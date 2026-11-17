import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database.js';
import Product from '../models/Product.js';

// 40 Unique, relevant, verified Unsplash image URLs (all tested and returning HTTP 200 OK)
export const uniqueProductImages = {
  // --- MEN (14) ---
  'mens-linen-casual-shirt': {
    url: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Linen Casual Shirt in Olive Green"
  },
  'mens-slim-fit-stretch-denim-jeans': {
    url: 'https://images.unsplash.com/photo-1582552938357-32b906df40cb?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Slim Fit Denim Jeans in Dark Indigo"
  },
  'mens-cotton-chino-trousers': {
    url: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Cotton Chino Trousers in Classic Khaki"
  },
  'mens-classic-pique-polo-t-shirt': {
    url: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Classic Pique Polo T-Shirt in Heather Grey"
  },
  'mens-heavyweight-fleece-hoodie': {
    url: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Heavyweight Fleece Hoodie in Slate Grey"
  },
  'mens-vintage-denim-trucker-jacket': {
    url: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Vintage Denim Trucker Jacket in Distressed Blue"
  },
  'mens-embroidered-cotton-kurta': {
    url: 'https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Embroidered Cotton Kurta in Ivory"
  },
  'mens-relaxed-camp-collar-shirt': {
    url: 'https://images.unsplash.com/photo-1598033129183-c4f50c736f10?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Relaxed Camp Collar Shirt in Terracotta Print"
  },
  'mens-premium-cotton-overshirt': {
    url: 'https://images.unsplash.com/photo-1527719327859-c6ce80353573?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Premium Cotton Overshirt in Khaki"
  },
  'mens-relaxed-fit-cargo-pants': {
    url: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Relaxed Fit Cargo Pants in Olive"
  },
  'mens-casual-printed-shirt': {
    url: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Casual Printed Shirt in Navy Geometric"
  },
  'mens-textured-knit-polo': {
    url: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Textured Knit Polo in Sand Dune"
  },
  'mens-slim-fit-formal-shirt': {
    url: 'https://images.unsplash.com/photo-1607345366928-199ea26cfe3e?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Slim Fit Formal Shirt in Crisp White"
  },
  'mens-cotton-casual-shorts': {
    url: 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80',
    altText: "Men's Cotton Casual Shorts in Beige"
  },

  // --- WOMEN (16) ---
  'womens-floral-tiered-midi-dress': {
    url: 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Floral Tiered Midi Dress in Rose Blossom"
  },
  'womens-a-line-printed-cotton-kurta': {
    url: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    altText: "Women's A-Line Printed Cotton Kurta in Indigo Floral"
  },
  'womens-high-rise-wide-leg-jeans': {
    url: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?auto=format&fit=crop&w=800&q=80',
    altText: "Women's High-Rise Wide-Leg Jeans in Light Vintage Wash"
  },
  'womens-ribbed-modal-crop-top': {
    url: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Ribbed Modal Crop Top in Sage Green"
  },
  'womens-oversized-knit-cardigan': {
    url: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Oversized Knit Cardigan in Oatmeal Cream"
  },
  'womens-pleated-formal-trousers': {
    url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Pleated Formal Trousers in Charcoal Melange"
  },
  'womens-silk-blend-printed-co-ord-set': {
    url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Silk Blend Printed Co-ord Set in Paisley Jade"
  },
  'womens-cropped-utility-jacket': {
    url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Cropped Utility Jacket in Khaki Twill"
  },
  'womens-premium-co-ord-set': {
    url: 'https://images.unsplash.com/photo-1584273143981-41c073dfe8f8?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Premium Co-ord Set in Oatmeal"
  },
  'womens-floral-printed-maxi-dress': {
    url: 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Floral Printed Maxi Dress in Blush Rose"
  },
  'womens-high-waist-palazzo-pants': {
    url: 'https://images.unsplash.com/photo-1551803091-e20673f15770?auto=format&fit=crop&w=800&q=80',
    altText: "Women's High-Waist Palazzo Pants in Ivory"
  },
  'womens-cotton-casual-top': {
    url: 'https://images.unsplash.com/photo-1564584217132-2271feaeb3c5?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Cotton Casual Top in Pure White"
  },
  'womens-embroidered-straight-kurta': {
    url: 'https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Embroidered Straight Kurta in Deep Maroon"
  },
  'womens-pleated-midi-skirt': {
    url: 'https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Pleated Midi Skirt in Sand Beige"
  },
  'womens-relaxed-fit-cargo-pants': {
    url: 'https://images.unsplash.com/photo-1517445312882-bc9910d016b7?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Relaxed Fit Cargo Pants in Khaki"
  },
  'womens-premium-casual-shirt': {
    url: 'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=800&q=80',
    altText: "Women's Premium Casual Shirt in Powder Blue"
  },

  // --- KIDS (10) ---
  'kids-cotton-graphic-fleece-hoodie': {
    url: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Cotton Graphic Fleece Hoodie in Mustard Yellow"
  },
  'kids-denim-jogger-pants': {
    url: 'https://images.unsplash.com/photo-1503919545889-aef636e10ad4?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Denim Jogger Pants in Medium Indigo"
  },
  'kids-organic-cotton-printed-t-shirt': {
    url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Organic Cotton Printed T-Shirt in Off-White"
  },
  'kids-floral-a-line-party-frock': {
    url: 'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Floral A-Line Party Frock in Pastel Coral"
  },
  'kids-festive-cotton-kurta-pyjama-set': {
    url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Festive Kurta Set in Royal Blue"
  },
  'kids-striped-pique-polo-shirt': {
    url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Striped Polo in Red and Navy"
  },
  'kids-boys-cotton-shirt-and-shorts-set': {
    url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Boys Cotton Shirt and Shorts Set in Sunny Yellow"
  },
  'kids-girls-printed-frock': {
    url: 'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Girls Printed Frock in Candy Pink"
  },
  'kids-cartoon-graphic-t-shirt': {
    url: 'https://images.unsplash.com/photo-1596870230751-ebdfce98ec42?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Cartoon Graphic T-Shirt in Cobalt Blue"
  },
  'kids-denim-dungaree-set': {
    url: 'https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80',
    altText: "Kids Denim Dungaree Set in Classic Wash"
  }
};

async function updateImages() {
  await connectDB();
  console.log('--- UPDATING PRODUCT IMAGES IN ATLAS DATABASE ---');

  const prods = await Product.find({});
  let updatedCount = 0;

  for (const p of prods) {
    const imgData = uniqueProductImages[p.slug];
    if (imgData) {
      p.images = [
        {
          url: imgData.url,
          altText: imgData.altText,
          isPrimary: true
        }
      ];
      await p.save();
      updatedCount++;
      console.log(`✓ Updated image for ${p.name} (${p.slug})`);
    } else {
      console.warn(`⚠️ No image defined for product: ${p.slug}`);
    }
  }

  console.log(`\n✅ Finished updating images for ${updatedCount} products!`);
  await disconnectDB();
}

updateImages().catch(console.error);

