import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';

/**
 * GET /api/v1/admin/analytics/summary
 * Real database aggregation queries for revenue, AOV, order volume, and catalog health.
 */
export const getAdminAnalyticsSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Revenue Definition:
    // Orders with paymentStatus === 'paid' OR
    // (paymentMethod === 'cod' AND orderStatus in ['confirmed', 'processing', 'shipped', 'delivered'])
    const revenueMatch = {
      ...dateFilter,
      $or: [
        { paymentStatus: 'paid' },
        {
          paymentMethod: 'cod',
          orderStatus: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      ]
    };

    // 1. Revenue & Order Aggregate
    const revenueStats = await Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$total' }
        }
      }
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const paidOrdersCount = revenueStats[0]?.orderCount || 0;
    const averageOrderValue = Math.round(revenueStats[0]?.avgOrderValue || 0);

    // 2. Total orders in range (regardless of payment status)
    const totalOrdersCount = await Order.countDocuments(dateFilter);

    // 3. Customer & Product Totals
    const [totalCustomers, totalProducts] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true })
    ]);

    // 4. Low stock variants alert (stock <= 5)
    const lowStockProducts = await Product.find({
      'variants.stockQuantity': { $lte: 5 }
    })
      .select('name brand images variants')
      .lean();

    const lowStockAlerts = [];
    for (const prod of lowStockProducts) {
      for (const v of prod.variants) {
        if (v.stockQuantity <= 5) {
          lowStockAlerts.push({
            productId: prod._id,
            productName: prod.name,
            brand: prod.brand,
            sku: v.sku,
            size: v.size,
            stockQuantity: v.stockQuantity,
            isOutOfStock: v.stockQuantity === 0
          });
        }
      }
    }

    // 5. Recent 5 orders
    const recentOrders = await Order.find()
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // 6. Top Selling Products
    const topProducts = await Product.find({ totalSalesCount: { $gt: 0 } })
      .sort({ totalSalesCount: -1 })
      .limit(5)
      .select('name brand slug images totalSalesCount variants')
      .lean();

    // 7. Order Status Breakdown
    const orderStatusAgg = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    // 8. Revenue Over Time (Day by Day)
    const revenueOverTime = await Order.aggregate([
      { $match: revenueMatch },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$total' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 30 }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalRevenue,
          totalOrders: totalOrdersCount,
          paidOrdersCount,
          averageOrderValue,
          totalCustomers,
          totalProducts,
          lowStockCount: lowStockAlerts.length
        },
        kpis: {
          revenue: totalRevenue,
          orders: totalOrdersCount,
          paidOrders: paidOrdersCount,
          averageOrderValue,
          customers: totalCustomers,
          products: totalProducts
        },
        lowStock: { count: lowStockAlerts.length },
        lowStockAlerts: lowStockAlerts.slice(0, 10),
        recentOrders,
        topProducts: topProducts.map((p) => ({
          productId: p._id,
          productName: p.name,
          brand: p.brand,
          slug: p.slug,
          images: p.images,
          totalSold: p.totalSalesCount || 0,
          totalRevenue: (p.totalSalesCount || 0) * (p.variants?.[0]?.price || 0)
        })),
        orderStatusBreakdown: orderStatusAgg,
        statusBreakdown: orderStatusAgg,
        revenueOverTime,
        revenueByDay: revenueOverTime
      }
    });
  } catch (error) {
    next(error);
  }
};
