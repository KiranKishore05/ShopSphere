import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

const slugify = (text) =>
  text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');

const escapeRegex = (string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/v1/admin/categories
 * All categories with active and total product counts, supporting search and status filtering.
 */
export const getAdminCategories = async (req, res, next) => {
  try {
    const query = {};

    if (req.query.status === 'active') {
      query.isActive = true;
    } else if (req.query.status === 'inactive') {
      query.isActive = false;
    }

    if (req.query.search && req.query.search.trim()) {
      const searchRegex = { $regex: escapeRegex(req.query.search.trim()), $options: 'i' };
      query.$or = [{ name: searchRegex }, { slug: searchRegex }, { description: searchRegex }];
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();

    // Attach real product counts (total products and active products)
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const [productCount, activeProductCount] = await Promise.all([
          Product.countDocuments({ categoryId: cat._id }),
          Product.countDocuments({ categoryId: cat._id, isActive: true })
        ]);

        return {
          ...cat,
          productCount,
          activeProductCount
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        categories: categoriesWithCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/admin/categories/:id
 * Retrieve a single category by ID with associated product counts.
 */
export const getAdminCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id).lean();
    if (!category) {
      return next(new AppError('Category not found in atelier catalog.', 404, 'CATEGORY_NOT_FOUND'));
    }

    const [productCount, activeProductCount] = await Promise.all([
      Product.countDocuments({ categoryId: category._id }),
      Product.countDocuments({ categoryId: category._id, isActive: true })
    ]);

    res.status(200).json({
      success: true,
      data: {
        category: {
          ...category,
          productCount,
          activeProductCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/admin/categories
 * Create new category with unique name and slug enforcement.
 */
export const createAdminCategory = async (req, res, next) => {
  try {
    const { name, slug: providedSlug, description, image, isActive } = req.body;

    const trimmedName = name.trim();
    const slug = providedSlug && providedSlug.trim() ? slugify(providedSlug.trim()) : slugify(trimmedName);

    // Case-insensitive duplicate name check
    const existingName = await Category.findOne({
      name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' }
    });
    if (existingName) {
      return next(new AppError(`Category '${trimmedName}' already exists.`, 409, 'DUPLICATE_CATEGORY_NAME'));
    }

    // Duplicate slug check
    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      return next(new AppError(`Category slug '${slug}' is already in use.`, 409, 'DUPLICATE_CATEGORY_SLUG'));
    }

    // Normalize image format
    const formattedImage = typeof image === 'string'
      ? { url: image, public_id: '', altText: trimmedName }
      : {
          url: image?.url || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
          public_id: image?.public_id || '',
          altText: image?.altText || trimmedName
        };

    const category = await Category.create({
      name: trimmedName,
      slug,
      description: description ? description.trim() : '',
      image: formattedImage,
      isActive: isActive !== undefined ? Boolean(isActive) : true
    });

    res.status(201).json({
      success: true,
      data: {
        category,
        message: `Category '${category.name}' created successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/categories/:id
 * Update category details, status, or slug with collision guards.
 */
export const updateAdminCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    }

    const { name, slug: providedSlug, description, image, isActive } = req.body;

    if (name && name.trim() !== category.name) {
      const trimmedName = name.trim();
      const existing = await Category.findOne({
        _id: { $ne: category._id },
        name: { $regex: `^${escapeRegex(trimmedName)}$`, $options: 'i' }
      });
      if (existing) {
        return next(new AppError(`Category '${trimmedName}' already exists.`, 409, 'DUPLICATE_CATEGORY_NAME'));
      }
      category.name = trimmedName;
    }

    if (providedSlug !== undefined) {
      const slug = providedSlug.trim() ? slugify(providedSlug.trim()) : slugify(category.name);
      if (slug !== category.slug) {
        const existing = await Category.findOne({ _id: { $ne: category._id }, slug });
        if (existing) {
          return next(new AppError(`Category slug '${slug}' already exists.`, 409, 'DUPLICATE_CATEGORY_SLUG'));
        }
        category.slug = slug;
      }
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      if (typeof image === 'string') {
        category.image = { url: image, public_id: '', altText: category.name };
      } else if (image && typeof image === 'object') {
        category.image = {
          url: image.url || category.image?.url || 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=80',
          public_id: image.public_id ?? category.image?.public_id ?? '',
          altText: image.altText ?? category.image?.altText ?? category.name
        };
      }
    }

    if (isActive !== undefined) {
      category.isActive = Boolean(isActive);
    }

    await category.save();

    res.status(200).json({
      success: true,
      data: {
        category,
        message: `Category '${category.name}' updated successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/admin/categories/:id
 * Strictly protect categories linked to existing garments.
 */
export const deleteAdminCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    }

    // Safety guard: Check if any products belong to this category
    const associatedProductsCount = await Product.countDocuments({ categoryId: category._id });
    if (associatedProductsCount > 0) {
      return next(
        new AppError(
          `Cannot delete category '${category.name}' because ${associatedProductsCount} garment(s) currently belong to it. Please reassign or remove them first.`,
          400,
          'CATEGORY_HAS_PRODUCTS',
          [{ field: 'categoryId', issue: `${associatedProductsCount} garment(s) linked` }]
        )
      );
    }

    await Category.findByIdAndDelete(category._id);

    res.status(200).json({
      success: true,
      data: {
        message: `Category '${category.name}' deleted successfully.`
      }
    });
  } catch (error) {
    next(error);
  }
};
