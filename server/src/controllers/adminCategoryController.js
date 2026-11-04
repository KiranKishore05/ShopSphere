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

/**
 * GET /api/v1/admin/categories
 * All categories with active product count.
 */
export const getAdminCategories = async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ name: 1 }).lean();

    // Aggregate product count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({ categoryId: cat._id });
        return {
          ...cat,
          productCount
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
 * POST /api/v1/admin/categories
 */
export const createAdminCategory = async (req, res, next) => {
  try {
    const { name, slug: providedSlug, description, image, isActive } = req.body;

    const slug = providedSlug ? slugify(providedSlug) : slugify(name);

    const existingName = await Category.findOne({ name: { $regex: `^${name}$`, $options: 'i' } });
    if (existingName) {
      return next(new AppError(`Category '${name}' already exists.`, 409, 'DUPLICATE_CATEGORY_NAME'));
    }

    const existingSlug = await Category.findOne({ slug });
    if (existingSlug) {
      return next(new AppError(`Category slug '${slug}' is already in use.`, 409, 'DUPLICATE_CATEGORY_SLUG'));
    }

    const category = await Category.create({
      name,
      slug,
      description,
      image,
      isActive: isActive !== undefined ? isActive : true
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
 */
export const updateAdminCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return next(new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND'));
    }

    const { name, slug: providedSlug, description, image, isActive } = req.body;

    if (name && name !== category.name) {
      const existing = await Category.findOne({ _id: { $ne: category._id }, name: { $regex: `^${name}$`, $options: 'i' } });
      if (existing) {
        return next(new AppError(`Category '${name}' already exists.`, 409, 'DUPLICATE_CATEGORY_NAME'));
      }
      category.name = name;
    }

    if (providedSlug) {
      const slug = slugify(providedSlug);
      if (slug !== category.slug) {
        const existing = await Category.findOne({ _id: { $ne: category._id }, slug });
        if (existing) {
          return next(new AppError(`Category slug '${slug}' already exists.`, 409, 'DUPLICATE_CATEGORY_SLUG'));
        }
        category.slug = slug;
      }
    }

    if (description !== undefined) category.description = description;
    if (image !== undefined) category.image = image;
    if (isActive !== undefined) category.isActive = isActive;

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
          'CATEGORY_HAS_PRODUCTS'
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
