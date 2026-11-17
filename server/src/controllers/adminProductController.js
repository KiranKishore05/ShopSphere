import Product from '../models/Product.js';
import Order from '../models/Order.js';
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

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = { $regex: req.query.search.trim(), $options: 'i' };
      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { 'variants.sku': searchRegex }
      ];
    }

    if (req.query.category && req.query.category !== 'all') {
      query.categoryId = req.query.category;
    }

    if (req.query.gender && req.query.gender !== 'all') {
      query.gender = req.query.gender;
    }

    if (req.query.status === 'active') {
      query.isActive = true;
    } else if (req.query.status === 'inactive') {
      query.isActive = false;
    } else if (req.query.isActive !== undefined && req.query.isActive !== 'all') {
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
      const variants = prod.variants || [];
      const totalStock = variants.reduce((acc, v) => acc + (v.stockQuantity || 0), 0);
      const hasLowStock = variants.some((v) => v.stockQuantity > 0 && v.stockQuantity <= 5);
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
          adminId: req.user?._id,
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
 * Updates product attributes and audits any manual stock adjustments per variant SKU.
 */
export const updateAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    const data = req.body;
    const inventoryMovementsToRecord = [];

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
            'DUPLICATE_SKU',
            [{ field: 'variants', issue: `SKU '${conflictSku}' already assigned to another garment` }]
          )
        );
      }

      // Track stock changes per variant SKU for audit movements
      const oldVariantMap = new Map(
        (product.variants || []).map((v) => [v.sku.toUpperCase(), v.stockQuantity])
      );

      data.variants = data.variants.map((v) => {
        const skuUpper = v.sku.toUpperCase();
        const previousStock = oldVariantMap.get(skuUpper);
        const newStock = Number(v.stockQuantity);

        if (previousStock !== undefined && previousStock !== newStock && !isNaN(newStock)) {
          const quantityChange = newStock - previousStock;
          if (quantityChange !== 0) {
            inventoryMovementsToRecord.push({
              productId: product._id,
              variantSku: skuUpper,
              quantityChange,
              previousStock,
              newStock,
              reason: quantityChange > 0 ? 'restock' : 'manual_adjustment',
              adminId: req.user?._id,
              note: `Manual stock adjustment for SKU '${skuUpper}' (${previousStock} → ${newStock})`
            });
          }
        } else if (previousStock === undefined && !isNaN(newStock) && newStock > 0) {
          // Newly added variant to an existing product
          inventoryMovementsToRecord.push({
            productId: product._id,
            variantSku: skuUpper,
            quantityChange: newStock,
            previousStock: 0,
            newStock,
            reason: 'initial_creation',
            adminId: req.user?._id,
            note: `Initial stock for added variant SKU '${skuUpper}'`
          });
        }

        return {
          ...v,
          sku: skuUpper
        };
      });
    }

    if (data.slug && data.slug !== product.slug) {
      const slugExists = await Product.findOne({ _id: { $ne: product._id }, slug: slugify(data.slug) });
      if (slugExists) {
        return next(new AppError('The requested URL slug is already taken.', 409, 'DUPLICATE_SLUG'));
      }
      data.slug = slugify(data.slug);
    }

    // Apply updates and persist product in MongoDB
    Object.assign(product, data);
    await product.save();

    // Persist inventory audit movements atomically after product is successfully saved
    if (inventoryMovementsToRecord.length > 0) {
      for (const movement of inventoryMovementsToRecord) {
        await InventoryMovement.create(movement);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        product,
        inventoryMovementsRecorded: inventoryMovementsToRecord.length,
        message: `Garment '${product.name}' updated successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/products/:id
 * Prefer soft-deletion (isActive = false).
 * Never hard-delete products referenced by existing orders or inventory records.
 */
export const deleteAdminProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return next(new AppError('Product not found.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // Check if referenced by existing orders OR inventory movements
    const [hasOrders, hasMovements] = await Promise.all([
      Order.exists({ 'items.productId': product._id }),
      InventoryMovement.exists({ productId: product._id })
    ]);

    // Mandatory safety rule: Soft-delete if referenced in orders or inventory movements,
    // or if standard deactivation was requested
    if (hasOrders || hasMovements || req.query.force !== 'true') {
      product.isActive = false;
      await product.save();

      return res.status(200).json({
        success: true,
        data: {
          product,
          deactivated: true,
          message: hasOrders || hasMovements
            ? `Garment '${product.name}' is referenced in historical orders/inventory movements. It has been safely deactivated to protect historical data integrity.`
            : `Garment '${product.name}' has been safely deactivated.`
        }
      });
    }

    // If completely unreferenced by orders AND inventory movements, and force=true:
    // Check if any of its images are referenced by other products before deleting from Cloudinary
    for (const img of product.images || []) {
      if (img.public_id) {
        const otherProductUsingImage = await Product.exists({
          _id: { $ne: product._id },
          'images.public_id': img.public_id
        });
        if (!otherProductUsingImage) {
          await deleteImage(img.public_id);
        }
      }
    }

    await Product.findByIdAndDelete(product._id);

    res.status(200).json({
      success: true,
      data: {
        product: null,
        deleted: true,
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
