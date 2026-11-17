import Category from '../models/Category.js';
import Product from '../models/Product.js';
import { AppError } from '../middleware/errorHandler.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select('name slug description image isActive createdAt')
      .lean();

    // Defined editorial ordering to match ShopSphere storefront specifications
    const preferredOrder = [
      'dresses-tops',
      'outerwear',
      'bottomwear',
      't-shirts',
      'ethnic-wear',
      'shirts',
      'kids-clothing'
    ];

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

    // Sort according to preferred order, with any extras sorted alphabetically
    categoriesWithCount.sort((a, b) => {
      const idxA = preferredOrder.indexOf(a.slug);
      const idxB = preferredOrder.indexOf(b.slug);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.name.localeCompare(b.name);
    });

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
