import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug description image isActive createdAt')
      .sort({ name: 1 })
      .lean();

    // Attach real live product counts for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const productCount = await Product.countDocuments({
          categoryId: cat._id,
          isActive: true
        });
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

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug: slug.toLowerCase(), isActive: true }).lean();

    if (!category) {
      return next(new AppError(`Category '${slug}' not found.`, 404, 'CATEGORY_NOT_FOUND'));
    }

    const productCount = await Product.countDocuments({
      categoryId: category._id,
      isActive: true
    });

    res.status(200).json({
      success: true,
      data: {
        category: {
          ...category,
          productCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};
