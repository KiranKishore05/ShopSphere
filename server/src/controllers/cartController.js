import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Helper to build an enriched, server-authoritative cart response.
 * Live prices and stock are strictly fetched from the Product catalog.
 */
export const buildEnrichedCart = async (userId) => {
  // Find or create customer cart
  let cart = await Cart.findOne({ userId });
  if (!cart) {
    cart = await Cart.create({ userId, items: [] });
  }

  if (!cart.items || cart.items.length === 0) {
    return {
      _id: cart._id,
      userId: cart.userId,
      items: [],
      subtotal: 0,
      totalItems: 0,
      currency: 'INR',
      freeShippingThreshold: 5000,
      isEligibleForFreeShipping: false,
      updatedAt: cart.updatedAt
    };
  }

  // Fetch all referenced products from database
  const productIds = cart.items.map(item => item.productId);
  const products = await Product.find({ _id: { $in: productIds } }).lean();
  const productMap = new Map(products.map(p => [p._id.toString(), p]));

  let subtotal = 0;
  let totalItems = 0;
  const enrichedItems = [];
  let cartModified = false;

  for (const item of cart.items) {
    const product = productMap.get(item.productId.toString());

    // Safely handle removed or inactive products
    if (!product || !product.isActive) {
      enrichedItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        productName: product?.name || 'Unavailable Product',
        productSlug: product?.slug || '',
        brand: product?.brand || 'ShopSphere',
        image: product?.images?.[0]?.url || '',
        size: 'N/A',
        color: { name: 'N/A', hexCode: '#CCCCCC' },
        price: 0,
        compareAtPrice: null,
        quantity: item.quantity,
        stockQuantity: 0,
        isAvailable: false,
        warning: 'This item is no longer available.',
        itemTotal: 0
      });
      continue;
    }

    // Locate requested variant by SKU
    const variant = product.variants.find(v => v.sku.toUpperCase() === item.variantSku.toUpperCase());
    if (!variant || !variant.isActive) {
      enrichedItems.push({
        productId: item.productId,
        variantSku: item.variantSku,
        productName: product.name,
        productSlug: product.slug,
        brand: product.brand,
        image: product.images?.[0]?.url || '',
        size: 'N/A',
        color: { name: 'N/A', hexCode: '#CCCCCC' },
        price: 0,
        compareAtPrice: null,
        quantity: item.quantity,
        stockQuantity: 0,
        isAvailable: false,
        warning: 'This variant option is no longer available.',
        itemTotal: 0
      });
      continue;
    }

    const isStockSufficient = variant.stockQuantity >= item.quantity;
    const isAvailable = isStockSufficient && variant.stockQuantity > 0;
    const lineTotal = variant.price * item.quantity;

    if (isAvailable) {
      subtotal += lineTotal;
    }
    totalItems += item.quantity;

    // Prefer variant image if available, fallback to product primary image
    const itemImage = product.images?.find(img => img.isPrimary)?.url || product.images?.[0]?.url || '';

    enrichedItems.push({
      productId: product._id,
      variantSku: variant.sku,
      productName: product.name,
      productSlug: product.slug,
      brand: product.brand,
      image: itemImage,
      size: variant.size,
      color: variant.color,
      price: variant.price, // Live database price
      compareAtPrice: variant.compareAtPrice,
      quantity: item.quantity,
      stockQuantity: variant.stockQuantity,
      isAvailable,
      warning: !isStockSufficient ? `Only ${variant.stockQuantity} unit(s) remaining in stock.` : null,
      itemTotal: lineTotal
    });
  }

  return {
    _id: cart._id,
    userId: cart.userId,
    items: enrichedItems,
    subtotal,
    totalItems,
    currency: 'INR',
    freeShippingThreshold: 5000,
    isEligibleForFreeShipping: subtotal >= 5000,
    updatedAt: cart.updatedAt
  };
};

/**
 * GET /api/v1/cart
 * Retrieve the authenticated customer's cart with live prices and computed subtotal.
 */
export const getCart = async (req, res, next) => {
  try {
    const enrichedCart = await buildEnrichedCart(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        cart: enrichedCart
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/cart/items
 * Add an item to the authenticated customer's cart.
 */
export const addItemToCart = async (req, res, next) => {
  try {
    const { productId, variantSku, quantity } = req.body;

    // Verify product exists and is active
    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return next(new AppError('The requested garment is unavailable or has been discontinued.', 404, 'PRODUCT_NOT_FOUND'));
    }

    // Verify variant belongs to product and is active
    const variant = product.variants.find(v => v.sku.toUpperCase() === variantSku.toUpperCase());
    if (!variant || !variant.isActive) {
      return next(new AppError(`Variant SKU '${variantSku}' does not exist for this product.`, 404, 'VARIANT_NOT_FOUND'));
    }

    // Find or create customer cart
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    // Check if variant already exists in customer's cart
    const existingIndex = cart.items.findIndex(
      item => item.variantSku.toUpperCase() === variantSku.toUpperCase()
    );

    const existingQty = existingIndex > -1 ? cart.items[existingIndex].quantity : 0;
    const requestedTotalQty = existingQty + quantity;

    // Check stock availability
    if (variant.stockQuantity < requestedTotalQty) {
      return next(new AppError(
        `Insufficient inventory. Only ${variant.stockQuantity} unit(s) available in stock.`,
        400,
        'INSUFFICIENT_STOCK',
        [{ field: 'quantity', issue: `Max available: ${variant.stockQuantity}` }]
      ));
    }

    if (existingIndex > -1) {
      cart.items[existingIndex].quantity = requestedTotalQty;
    } else {
      cart.items.push({
        productId: product._id,
        variantSku: variant.sku,
        quantity
      });
    }

    await cart.save();

    const enrichedCart = await buildEnrichedCart(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        cart: enrichedCart
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/cart/items/:itemSku
 * Update line item quantity in customer's cart. Quantity of 0 removes the item.
 */
export const updateCartItem = async (req, res, next) => {
  try {
    const { itemSku } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return next(new AppError('Shopping cart not found.', 404, 'CART_NOT_FOUND'));
    }

    const itemIndex = cart.items.findIndex(
      item => item.variantSku.toUpperCase() === itemSku.toUpperCase()
    );

    if (itemIndex === -1) {
      return next(new AppError(`Item with SKU '${itemSku}' not found in cart.`, 404, 'CART_ITEM_NOT_FOUND'));
    }

    // If quantity is 0, remove item from cart
    if (quantity === 0) {
      cart.items.splice(itemIndex, 1);
      await cart.save();
      const enrichedCart = await buildEnrichedCart(req.user._id);
      return res.status(200).json({
        success: true,
        data: {
          cart: enrichedCart
        }
      });
    }

    // Validate stock for updated quantity
    const product = await Product.findById(cart.items[itemIndex].productId);
    if (!product || !product.isActive) {
      return next(new AppError('The requested garment is no longer available.', 400, 'PRODUCT_UNAVAILABLE'));
    }

    const variant = product.variants.find(v => v.sku.toUpperCase() === itemSku.toUpperCase());
    if (!variant || !variant.isActive) {
      return next(new AppError('The requested variant is no longer available.', 400, 'VARIANT_UNAVAILABLE'));
    }

    if (variant.stockQuantity < quantity) {
      return next(new AppError(
        `Insufficient inventory. Only ${variant.stockQuantity} unit(s) available in stock.`,
        400,
        'INSUFFICIENT_STOCK',
        [{ field: 'quantity', issue: `Max available: ${variant.stockQuantity}` }]
      ));
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();

    const enrichedCart = await buildEnrichedCart(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        cart: enrichedCart
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/cart/items/:itemSku
 * Remove an item from the customer's cart.
 */
export const removeCartItem = async (req, res, next) => {
  try {
    const { itemSku } = req.params;

    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return next(new AppError('Shopping cart not found.', 404, 'CART_NOT_FOUND'));
    }

    const itemIndex = cart.items.findIndex(
      item => item.variantSku.toUpperCase() === itemSku.toUpperCase()
    );

    if (itemIndex === -1) {
      return next(new AppError(`Item with SKU '${itemSku}' not found in cart.`, 404, 'CART_ITEM_NOT_FOUND'));
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    const enrichedCart = await buildEnrichedCart(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        cart: enrichedCart
      }
    });
  } catch (error) {
    next(error);
  }
};
