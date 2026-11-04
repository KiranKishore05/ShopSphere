import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';
import { AppError } from '../middleware/errorHandler.js';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

/**
 * GET /api/v1/admin/products
 * Paginated product catalog for administrative oversight.
 */
export const getAdminProducts = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = {};

    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } },
        { 'variants.sku': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.category) {
      query.categoryId = req.query.category;
    }

    if (req.query.gender) {
      query.gender = req.query.gender;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    }

    if (req.query.stock === 'low_stock') {
      query['variants.stockQuantity'] = { $gt: 0, $lte: 5 };
    } else if (req.query.stock === 'out_of_stock') {
      query['variants.stockQuantity'] = { $lte: 0 };
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate('categoryId', 'name slug')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query)
    ]);

    // Enhance products with calculated aggregate stock
    const enhancedProducts = products.map((prod) => {
      const totalStock = prod.variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
      const hasLowStock = prod.variants.some((v) => v.stockQuantity > 0 && v.stockQuantity <= 5);
      const isOutOfStock = totalStock === 0;

      return {
        ...prod,
        totalStock,
        stockStatus: isOutOfStock ? 'out_of_stock' : hasLowStock ? 'low_stock' : 'healthy'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        products: enhancedProducts,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/products/:id
 */
export const getAdminProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('categoryId', 'name slug')
      .lean();

    if (!product) {
      return next(new AppError('Product not found in atelier catalog.', 404, 'PRODUCT_NOT_FOUND'));
    }

    res.status(200).json({
      success: true,
      data: { product }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/products
 * Create product with variant uniqueness check and inventory movement initialisation.
 */
export const createAdminProduct = async (req, res, next) => {
  try {
    const data = req.body;

    // Generate unique slug
    let slug = data.slug ? slugify(data.slug) : slugify(data.name);
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      slug = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Verify all variant SKUs are unique across entire catalog
    const incomingSkus = data.variants.map((v) => v.sku.toUpperCase());
    const existingVariantProduct = await Product.findOne({
      'variants.sku': { $in: incomingSkus }
    });

    if (existingVariantProduct) {
      const conflictSku = existingVariantProduct.variants.find((v) =>
        incomingSkus.includes(v.sku)
      )?.sku;
      return next(
        new AppError(
          `Variant SKU '${conflictSku}' is already assigned to product '${existingVariantProduct.name}'. SKUs must be globally unique.`,
          409,
          'DUPLICATE_SKU',
          [{ field: 'variants', issue: `SKU '${conflictSku}' already exists` }]
        )
      );
    }

    // Format variants
    const formattedVariants = data.variants.map((v) => ({
      ...v,
      sku: v.sku.toUpperCase()
    }));

    const product = new Product({
      ...data,
      slug,
      variants: formattedVariants
    });

    await product.save();

    // Create initial inventory audit records for non-zero variants
    for (const v of product.variants) {
      if (v.stockQuantity > 0) {
        await InventoryMovement.create({
          productId: product._id,
          variantSku: v.sku,
          quantityChange: v.stockQuantity,
          previousStock: 0,
          newStock: v.stockQuantity,
          reason: 'initial_creation',
          adminId: req.user._id,
          note: `Initial catalogue stock on creation of '${product.name}'`
        });
      }
    }

    res.status(201).json({
      success: true,
      data: {
        product,
        message: `Garment '${product.name}' successfully added to catalog.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/products/:id
 */
export const updateAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    const data = req.body;

    // If variants are being replaced/updated, verify SKU uniqueness against OTHER products
    if (data.variants && data.variants.length > 0) {
      const incomingSkus = data.variants.map((v) => v.sku.toUpperCase());
      const existingConflict = await Product.findOne({
        _id: { $ne: product._id },
        'variants.sku': { $in: incomingSkus }
      });

      if (existingConflict) {
        const conflictSku = existingConflict.variants.find((v) =>
          incomingSkus.includes(v.sku)
        )?.sku;
        return next(
          new AppError(
            `Variant SKU '${conflictSku}' is already in use by '${existingConflict.name}'.`,
            409,
            'DUPLICATE_SKU'
          )
        );
      }
      data.variants = data.variants.map((v) => ({
        ...v,
        sku: v.sku.toUpperCase()
      }));
    }

    if (data.slug && data.slug !== product.slug) {
      const slugExists = await Product.findOne({ _id: { $ne: product._id }, slug: slugify(data.slug) });
      if (slugExists) {
        return next(new AppError('The requested URL slug is already taken.', 409, 'DUPLICATE_SLUG'));
      }
      data.slug = slugify(data.slug);
    }

    Object.assign(product, data);
    await product.save();

    res.status(200).json({
      success: true,
      data: {
        product,
        message: `Garment '${product.name}' updated successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 */
export const deleteAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // Clean up associated Cloudinary image assets if any
    for (const img of product.images) {
      if (img.public_id) {
        await deleteImage(img.public_id);
      }
    }

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      success: true,
      data: {
        message: `Product '${product.name}' permanently removed from atelier catalog.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/uploads/image
 */
export const uploadProductImage = async (req, res, next) => {
  try {
    const { image, folder } = req.body;
    const uploadedAsset = await uploadImage(image, folder || 'shopsphere/products');

    res.status(200).json({
      success: true,
      data: uploadedAsset
    });
  } catch (error) {
    next(error);
  }
};
