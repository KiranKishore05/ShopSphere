import Product from '../models/Product.js';
import InventoryMovement from '../models/InventoryMovement.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/inventory
 * Overview of all inventory variants across the atelier with low-stock warnings.
 */
export const getAdminInventoryOverview = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.category && req.query.category !== 'all') {
      query.categoryId = req.query.category;
    }
    if (req.query.search) {
      query.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { brand: { $regex: req.query.search, $options: 'i' } },
        { 'variants.sku': { $regex: req.query.search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query)
      .select('name brand images variants categoryId updatedAt')
      .populate('categoryId', 'name')
      .lean();

    // Flatten into variant list
    let allVariants = [];
    for (const prod of products) {
      for (const v of prod.variants) {
        allVariants.push({
          productId: prod._id,
          productName: prod.name,
          brand: prod.brand,
          categoryName: prod.categoryId?.name || 'Atelier',
          primaryImage: prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url || '',
          variantId: v._id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          price: v.price,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
          status: v.stockQuantity === 0 ? 'out_of_stock' : v.stockQuantity <= 5 ? 'low_stock' : 'healthy',
          warehouse: '#WR-001 (Main Atelier)',
          updatedAt: prod.updatedAt
        });
      }
    }

    if (req.query.status && req.query.status !== 'all') {
      allVariants = allVariants.filter((v) => v.status === req.query.status);
    }

    if (req.query.stockRange && req.query.stockRange !== 'all') {
      if (req.query.stockRange === '1-10') {
        allVariants = allVariants.filter((v) => v.stockQuantity >= 1 && v.stockQuantity <= 10);
      } else if (req.query.stockRange === '11-50') {
        allVariants = allVariants.filter((v) => v.stockQuantity >= 11 && v.stockQuantity <= 50);
      } else if (req.query.stockRange === '50+') {
        allVariants = allVariants.filter((v) => v.stockQuantity > 50);
      } else if (req.query.stockRange === '0') {
        allVariants = allVariants.filter((v) => v.stockQuantity === 0);
      }
    }

    const totalVariants = allVariants.length;
    const paginatedVariants = allVariants.slice(skip, skip + limit);

    // Summary counts for Image 1 reference
    const inStockCount = allVariants.filter((v) => v.status === 'healthy').length;
    const lowStockCount = allVariants.filter((v) => v.status === 'low_stock').length;
    const outOfStockCount = allVariants.filter((v) => v.status === 'out_of_stock').length;
    const totalUnits = allVariants.reduce((sum, v) => sum + v.stockQuantity, 0);

    const items = paginatedVariants.map((v) => ({
      ...v,
      colorName: v.color?.name || 'Standard',
      colorHex: v.color?.hexCode || '#161513',
      isLowStock: v.status === 'low_stock'
    }));

    res.status(200).json({
      success: true,
      data: {
        items,
        variants: items,
        summary: {
          totalProducts: products.length,
          totalVariants,
          totalUnits,
          inStockCount,
          lowStockCount,
          outOfStockCount
        },
        meta: {
          page,
          limit,
          total: totalVariants,
          totalPages: Math.ceil(totalVariants / limit),
          lowStockCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/inventory/adjust
 * Atomically adjust variant stock and record immutable audit movement.
 */
export const adjustAdminStock = async (req, res, next) => {
  try {
    const { productId, variantSku, quantityChange, reason, note } = req.body;

    const skuUpper = variantSku.toUpperCase();
    const product = await Product.findOne({
      _id: productId,
      'variants.sku': skuUpper
    });

    if (!product) {
      return next(new AppError('Product or variant SKU not found.', 404, 'VARIANT_NOT_FOUND'));
    }

    const variant = product.variants.find((v) => v.sku === skuUpper);
    const previousStock = variant.stockQuantity;
    const newStock = previousStock + quantityChange;

    if (newStock < 0) {
      return next(
        new AppError(
          `Adjustment of ${quantityChange} would result in negative stock (${newStock}) for SKU '${skuUpper}'. Current available: ${previousStock}.`,
          400,
          'NEGATIVE_STOCK_DISALLOWED'
        )
      );
    }

    // Atomic update with concurrency protection
    const updated = await Product.findOneAndUpdate(
      {
        _id: productId,
        'variants.sku': skuUpper,
        'variants.stockQuantity': { $gte: quantityChange < 0 ? Math.abs(quantityChange) : 0 }
      },
      {
        $inc: { 'variants.$.stockQuantity': quantityChange }
      },
      { new: true }
    );

    if (!updated) {
      return next(
        new AppError('Stock level changed concurrently. Please refresh and retry adjustment.', 409, 'INVENTORY_CONFLICT')
      );
    }

    // Record immutable audit movement
    const movement = await InventoryMovement.create({
      productId,
      variantSku: skuUpper,
      quantityChange,
      previousStock,
      newStock,
      reason,
      adminId: req.user._id,
      note: note || `Manual adjustment by admin (${req.user.name})`
    });

    res.status(200).json({
      success: true,
      data: {
        movement,
        updatedStock: newStock,
        message: `Inventory for SKU '${skuUpper}' adjusted to ${newStock} units.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/inventory/movements
 * Audit trail of all stock movements.
 */
export const getAdminInventoryMovements = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.sku) {
      query.variantSku = req.query.sku.toUpperCase();
    }
    if (req.query.productId) {
      query.productId = req.query.productId;
    }
    if (req.query.reason) {
      query.reason = req.query.reason;
    }

    const [movements, total] = await Promise.all([
      InventoryMovement.find(query)
        .populate('productId', 'name brand')
        .populate('adminId', 'name email')
        .populate('orderId', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryMovement.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: {
        movements,
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
