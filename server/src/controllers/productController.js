import mongoose from 'mongoose';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import { AppError } from '../middleware/errorHandler.js';

// Safe regex escaping utility to prevent RegExp injection
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Transform product document into public summary format
export const formatProductSummary = (product) => {
  const variants = product.variants || [];
  const prices = variants.map(v => v.price).filter(p => typeof p === 'number');
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  const comparePrices = variants.map(v => v.compareAtPrice).filter(p => typeof p === 'number' && p > 0);
  const maxComparePrice = comparePrices.length ? Math.max(...comparePrices) : null;

  // Natural fashion size ordering
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', '40', '42', '44', 'One Size'];
  const rawSizes = [...new Set(variants.map(v => v.size))];
  const availableSizes = rawSizes.sort((a, b) => {
    const idxA = sizeOrder.indexOf(a);
    const idxB = sizeOrder.indexOf(b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });

  // Unique colors
  const colorMap = new Map();
  variants.forEach(v => {
    if (v.color && v.color.name && !colorMap.has(v.color.name.toLowerCase())) {
      colorMap.set(v.color.name.toLowerCase(), {
        name: v.color.name,
        hexCode: v.color.hexCode
      });
    }
  });

  const totalStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);

  return {
    _id: product._id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    gender: product.gender,
    category: product.categoryId ? {
      _id: product.categoryId._id,
      name: product.categoryId.name,
      slug: product.categoryId.slug
    } : null,
    images: product.images || [],
    priceRange: { min: minPrice, max: maxPrice },
    compareAtPrice: maxComparePrice,
    availableSizes,
    availableColors: Array.from(colorMap.values()),
    inStock: totalStock > 0,
    totalStock,
    isFeatured: product.isFeatured || false,
    averageRating: product.averageRating || 0,
    reviewCount: product.reviewCount || 0,
    createdAt: product.createdAt
  };
};

// Transform product document into full detail view
export const formatProductDetail = (product) => {
  const summary = formatProductSummary(product);
  return {
    ...summary,
    description: product.description,
    tags: product.tags || [],
    category: product.categoryId ? {
      _id: product.categoryId._id,
      name: product.categoryId.name,
      slug: product.categoryId.slug,
      description: product.categoryId.description
    } : null,
    variants: (product.variants || []).map(v => ({
      _id: v._id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      stockQuantity: v.stockQuantity,
      inStock: v.stockQuantity > 0,
      isActive: v.isActive
    }))
  };
};

export const getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      gender,
      size,
      color,
      minPrice,
      maxPrice,
      inStock,
      sort = 'newest'
    } = req.query;

    const filter = { isActive: true };

    // 1. Text Search across name, brand, tags, description, and categories
    if (search && search.trim()) {
      const escaped = escapeRegex(search.trim());
      const regex = new RegExp(escaped, 'i');

      const matchingCats = await Category.find({
        $or: [{ name: regex }, { slug: regex }],
        isActive: true
      }).select('_id');
      const catIds = matchingCats.map(c => c._id);

      filter.$or = [
        { name: regex },
        { brand: regex },
        { tags: regex },
        { description: regex }
      ];

      if (catIds.length > 0) {
        filter.$or.push({ categoryId: { $in: catIds } });
      }
    }

    // 2. Category Filter (slug, alias, or ObjectId)
    if (category && category.trim()) {
      const catTrim = category.trim();
      const slugAliases = {
        'jeans-trousers': 'bottomwear',
        'jackets-hoodies': 'outerwear',
        'ethnic-wear': 'ethnic-wear',
        'dresses-tops': 'dresses-tops',
        'kids-clothing': 'kids-clothing'
      };
      const normalizedSlug = slugAliases[catTrim.toLowerCase()] || catTrim.toLowerCase();

      let categoryDoc = null;
      if (mongoose.Types.ObjectId.isValid(catTrim)) {
        categoryDoc = await Category.findById(catTrim);
      } else {
        categoryDoc = await Category.findOne({
          $or: [
            { slug: normalizedSlug },
            { slug: catTrim.toLowerCase() },
            { name: new RegExp(`^${escapeRegex(catTrim)}$`, 'i') }
          ]
        });
      }

      if (!categoryDoc) {
        // Requested non-existent category -> return empty dataset with zero count
        return res.status(200).json({
          success: true,
          data: { products: [] },
          meta: { page, limit, total: 0, totalPages: 0 }
        });
      }
      filter.categoryId = categoryDoc._id;
    }

    // 3. Gender Filter
    if (gender && gender !== 'all') {
      filter.gender = gender;
    }

    // 4. Variant Size Filter
    if (size) {
      filter['variants.size'] = size;
    }

    // 5. Variant Color Filter
    if (color && color.trim()) {
      const colorRegex = new RegExp(escapeRegex(color.trim()), 'i');
      filter['variants.color.name'] = colorRegex;
    }

    // 6. Price Range Filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter['variants.price'] = {};
      if (minPrice !== undefined) {
        filter['variants.price'].$gte = minPrice;
      }
      if (maxPrice !== undefined) {
        filter['variants.price'].$lte = maxPrice;
      }
    }

    // 7. In-Stock Variant Availability Filter
    if (inStock === true) {
      filter['variants.stockQuantity'] = { $gt: 0 };
    }

    // 8. Deterministic Sorting
    let sortObj = { createdAt: -1, _id: -1 };
    switch (sort) {
      case 'price_asc':
        sortObj = { 'variants.price': 1, _id: 1 };
        break;
      case 'price_desc':
        sortObj = { 'variants.price': -1, _id: 1 };
        break;
      case 'popular':
        // Primary sort on verified total sales count, secondary on rating, tertiary on _id
        sortObj = { totalSalesCount: -1, averageRating: -1, _id: 1 };
        break;
      case 'rating':
        sortObj = { averageRating: -1, reviewCount: -1, _id: 1 };
        break;
      case 'relevance':
        sortObj = search ? { totalSalesCount: -1, createdAt: -1 } : { createdAt: -1, _id: -1 };
        break;
      case 'newest':
      default:
        sortObj = { createdAt: -1, _id: -1 };
        break;
    }

    // Execute count and paginated query concurrently
    const [total, rawProducts] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .populate('categoryId', 'name slug description')
        .sort(sortObj)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
    ]);

    const formattedProducts = rawProducts.map(formatProductSummary);

    res.status(200).json({
      success: true,
      data: {
        products: formattedProducts
      },
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/products/search/suggestions
 * Search suggestions while typing for storefront autocomplete.
 */
export const getSearchSuggestions = async (req, res, next) => {
  try {
    const queryStr = req.query.q || req.query.search || req.query.query || '';
    const trimmed = queryStr.trim();

    if (!trimmed || trimmed.length < 1) {
      return res.status(200).json({
        success: true,
        data: {
          products: [],
          categories: [],
          totalCount: 0
        }
      });
    }

    const regex = new RegExp(escapeRegex(trimmed), 'i');

    const [matchingProducts, matchingCategories, totalMatchingCount] = await Promise.all([
      Product.find({
        isActive: true,
        $or: [
          { name: regex },
          { brand: regex },
          { tags: regex }
        ]
      })
        .select('name slug brand images variants categoryId averageRating reviewCount')
        .populate('categoryId', 'name slug')
        .limit(6)
        .lean(),

      Category.find({
        isActive: true,
        $or: [
          { name: regex },
          { slug: regex }
        ]
      })
        .select('name slug')
        .limit(4)
        .lean(),

      Product.countDocuments({
        isActive: true,
        $or: [
          { name: regex },
          { brand: regex },
          { tags: regex },
          { description: regex }
        ]
      })
    ]);

    const products = matchingProducts.map(p => {
      const summary = formatProductSummary(p);
      return {
        _id: p._id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        image: p.images?.[0]?.url || '',
        priceRange: summary.priceRange,
        inStock: summary.inStock,
        category: p.categoryId ? { name: p.categoryId.name, slug: p.categoryId.slug } : null,
        averageRating: p.averageRating || 0,
        reviewCount: p.reviewCount || 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        products,
        categories: matchingCategories.map(c => ({
          _id: c._id,
          name: c.name,
          slug: c.slug
        })),
        totalCount: totalMatchingCount
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const product = await Product.findOne({ slug: slug.toLowerCase(), isActive: true })
      .populate('categoryId', 'name slug description')
      .lean();

    if (!product) {
      return next(new AppError(`Product with slug '${slug}' not found.`, 404, 'PRODUCT_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: {
        product: formatProductDetail(product)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryProducts = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const slugAliases = {
      'jeans-trousers': 'bottomwear',
      'jackets-hoodies': 'outerwear'
    };
    const normalizedSlug = slugAliases[slug.toLowerCase()] || slug.toLowerCase();

    const categoryDoc = await Category.findOne({
      $or: [
        { slug: normalizedSlug },
        { slug: slug.toLowerCase() },
        { name: new RegExp(`^${escapeRegex(slug)}$`, 'i') }
      ],
      isActive: true
    }).lean();

    if (!categoryDoc) {
      return next(new AppError(`Category '${slug}' not found.`, 404, 'CATEGORY_NOT_FOUND'));
    }

    // Attach category identifier to query and delegate
    req.query.category = categoryDoc.slug;
    return getProducts(req, res, next);
  } catch (error) {
    next(error);
  }
};
