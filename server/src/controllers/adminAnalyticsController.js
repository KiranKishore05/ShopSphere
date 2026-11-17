import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';

/**
 * GET /api/v1/admin/analytics/summary
 * GET /api/v1/admin/dashboard
 * Verified database aggregation pipelines for settled net revenue, category-wise performance,
 * client acquisition & retention, payment distributions, and bestsellers.
 */
export const getAdminAnalyticsSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, period } = req.query;

    const dateFilter = {};
    if (period && period !== 'all') {
      const now = new Date();
      const start = new Date();
      if (period === '7d') start.setDate(now.getDate() - 7);
      else if (period === '30d') start.setDate(now.getDate() - 30);
      else if (period === '90d') start.setDate(now.getDate() - 90);
      else if (period === '12m') start.setFullYear(now.getFullYear() - 1);
      dateFilter.createdAt = { $gte: start, $lte: now };
    } else if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Settled Revenue Matching Rules:
    // - Razorpay: paymentStatus === 'paid'
    // - COD: orderStatus === 'delivered' AND paymentStatus === 'paid' (collected upon white-glove handover)
    // - Exclude cancelled, failed, or pending transactions
    const settledMatch = {
      ...dateFilter,
      orderStatus: { $nin: ['cancelled'] },
      $or: [
        { paymentMethod: 'cod', orderStatus: 'delivered', paymentStatus: 'paid' },
        { paymentMethod: 'razorpay', paymentStatus: 'paid' }
      ]
    };

    // 1. Revenue & Order Aggregate with Refund Awareness
    const revenueStats = await Order.aggregate([
      { $match: settledMatch },
      {
        $lookup: {
          from: 'payments',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$orderId', '$$orderId'] },
                paymentStatus: { $in: ['paid', 'refunded'] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'paymentInfo'
        }
      },
      {
        $addFields: {
          matchedPayment: { $arrayElemAt: ['$paymentInfo', 0] }
        }
      },
      {
        $addFields: {
          refundsArraySum: {
            $reduce: {
              input: { $ifNull: ['$matchedPayment.refunds', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
            }
          },
          singleRefundAmount: { $ifNull: ['$matchedPayment.refundInfo.amount', 0] }
        }
      },
      {
        $addFields: {
          refundAmount: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$matchedPayment.refunds', []] } }, 0] },
              '$refundsArraySum',
              {
                $cond: [
                  { $gt: ['$singleRefundAmount', 0] },
                  '$singleRefundAmount',
                  {
                    $cond: [
                      { $eq: ['$matchedPayment.paymentStatus', 'refunded'] },
                      '$total',
                      0
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          netRevenue: {
            $max: [0, { $subtract: ['$total', '$refundAmount'] }]
          }
        }
      },
      {
        $match: {
          netRevenue: { $gt: 0 } // Exclude fully refunded orders from recognised revenue
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$netRevenue' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$netRevenue' }
        }
      }
    ]);

    const totalRevenue = revenueStats[0]?.totalRevenue || 0;
    const paidOrdersCount = revenueStats[0]?.orderCount || 0;
    const averageOrderValue = Math.round(revenueStats[0]?.avgOrderValue || 0);

    // 2. Total orders in range (regardless of payment status)
    const totalOrdersCount = await Order.countDocuments(dateFilter);

    // 3. Customer & Product Base Totals
    const [totalCustomers, totalProducts] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Product.countDocuments({ isActive: true })
    ]);

    // Customer Acquisition in selected window
    const newCustomersCount = await User.countDocuments({
      role: 'customer',
      ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {})
    });

    // Repeat Customers: Customers with 2 or more non-cancelled orders
    const customerOrderAgg = await Order.aggregate([
      { $match: { orderStatus: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$userId',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$total' }
        }
      }
    ]);
    const customersWithOrdersCount = customerOrderAgg.length;
    const repeatCustomersCount = customerOrderAgg.filter(c => c.orderCount >= 2).length;
    const repeatCustomerRate = customersWithOrdersCount > 0
      ? Math.round((repeatCustomersCount / customersWithOrdersCount) * 100)
      : 0;

    // 4. Order Status Breakdown
    const statusAgg = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    const statusMap = statusAgg.reduce((acc, curr) => {
      acc[curr._id] = curr.count;
      return acc;
    }, {});

    const pendingOrdersCount = (statusMap['pending_payment'] || 0) + (statusMap['pending'] || 0);
    const confirmedOrdersCount =
      (statusMap['confirmed'] || 0) +
      (statusMap['processing'] || 0) +
      (statusMap['shipped'] || 0) +
      (statusMap['delivered'] || 0);
    const cancelledOrdersCount = statusMap['cancelled'] || 0;

    // 5. Payment Channel & Settlement Status Breakdowns
    const [paymentMethodStats, paymentStatusStats] = await Promise.all([
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' }
          }
        }
      ]),
      Order.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$paymentStatus',
            count: { $sum: 1 },
            totalAmount: { $sum: '$total' }
          }
        }
      ])
    ]);

    // 6. Low stock variants alert (stock <= 5)
    const lowStockProducts = await Product.find({
      'variants.stockQuantity': { $lte: 5 }
    })
      .select('name brand images variants categoryId')
      .populate('categoryId', 'name')
      .lean();

    const lowStockAlerts = [];
    const lowStockProductIds = new Set();
    for (const prod of lowStockProducts) {
      for (const v of prod.variants) {
        if (v.stockQuantity <= 5) {
          lowStockProductIds.add(prod._id.toString());
          lowStockAlerts.push({
            productId: prod._id,
            productName: prod.name,
            brand: prod.brand,
            categoryName: prod.categoryId?.name || 'Catalogue',
            image: prod.images?.find((img) => img.isPrimary)?.url || prod.images?.[0]?.url || '',
            sku: v.sku,
            size: v.size,
            color: v.color?.name || '',
            stockQuantity: v.stockQuantity,
            isOutOfStock: v.stockQuantity === 0,
            threshold: 5
          });
        }
      }
    }
    const lowStockProductsCount = lowStockProductIds.size;

    // 7. Recent 10 orders with customer data
    const recentOrders = await Order.find(dateFilter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 8. Bestselling Products
    const topProducts = await Product.find({ totalSalesCount: { $gt: 0 } })
      .sort({ totalSalesCount: -1 })
      .limit(5)
      .select('name brand slug images totalSalesCount variants categoryId')
      .populate('categoryId', 'name')
      .lean();

    // Low-performing / zero sales products in active catalogue
    const lowPerformingProducts = await Product.find({ isActive: true })
      .sort({ totalSalesCount: 1, createdAt: 1 })
      .limit(5)
      .select('name brand slug images totalSalesCount variants categoryId')
      .populate('categoryId', 'name')
      .lean();

    // 9. Category-Wise Sales and Revenue
    const categorySales = await Order.aggregate([
      { $match: settledMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.productId',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.categoryId',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: { $ifNull: ['$category._id', 'uncategorized'] },
          categoryName: { $first: { $ifNull: ['$category.name', 'Atelier Collection'] } },
          categorySlug: { $first: { $ifNull: ['$category.slug', 'collection'] } },
          unitsSold: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } },
          orderIds: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          _id: 1,
          categoryName: 1,
          categorySlug: 1,
          unitsSold: 1,
          revenue: 1,
          orderCount: { $size: '$orderIds' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    // 10. Daily Sales Summary (up to 90 days) with IST (+05:30) Timezone & Refund Deduction
    const dailySales = await Order.aggregate([
      { $match: settledMatch },
      {
        $lookup: {
          from: 'payments',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$orderId', '$$orderId'] },
                paymentStatus: { $in: ['paid', 'refunded'] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'paymentInfo'
        }
      },
      {
        $addFields: {
          matchedPayment: { $arrayElemAt: ['$paymentInfo', 0] }
        }
      },
      {
        $addFields: {
          refundsArraySum: {
            $reduce: {
              input: { $ifNull: ['$matchedPayment.refunds', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
            }
          },
          singleRefundAmount: { $ifNull: ['$matchedPayment.refundInfo.amount', 0] }
        }
      },
      {
        $addFields: {
          refundAmount: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$matchedPayment.refunds', []] } }, 0] },
              '$refundsArraySum',
              {
                $cond: [
                  { $gt: ['$singleRefundAmount', 0] },
                  '$singleRefundAmount',
                  {
                    $cond: [
                      { $eq: ['$matchedPayment.paymentStatus', 'refunded'] },
                      '$total',
                      0
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          netRevenue: {
            $max: [0, { $subtract: ['$total', '$refundAmount'] }]
          }
        }
      },
      {
        $match: {
          netRevenue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } },
          date: { $first: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: '+05:30' } } },
          revenue: { $sum: '$netRevenue' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 90 }
    ]);

    // 11. Monthly Sales Summary (up to 24 months) with IST (+05:30) Timezone & Refund Deduction
    const monthlySales = await Order.aggregate([
      { $match: settledMatch },
      {
        $lookup: {
          from: 'payments',
          let: { orderId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$orderId', '$$orderId'] },
                paymentStatus: { $in: ['paid', 'refunded'] }
              }
            },
            { $sort: { createdAt: -1 } },
            { $limit: 1 }
          ],
          as: 'paymentInfo'
        }
      },
      {
        $addFields: {
          matchedPayment: { $arrayElemAt: ['$paymentInfo', 0] }
        }
      },
      {
        $addFields: {
          refundsArraySum: {
            $reduce: {
              input: { $ifNull: ['$matchedPayment.refunds', []] },
              initialValue: 0,
              in: { $add: ['$$value', { $ifNull: ['$$this.amount', 0] }] }
            }
          },
          singleRefundAmount: { $ifNull: ['$matchedPayment.refundInfo.amount', 0] }
        }
      },
      {
        $addFields: {
          refundAmount: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ['$matchedPayment.refunds', []] } }, 0] },
              '$refundsArraySum',
              {
                $cond: [
                  { $gt: ['$singleRefundAmount', 0] },
                  '$singleRefundAmount',
                  {
                    $cond: [
                      { $eq: ['$matchedPayment.paymentStatus', 'refunded'] },
                      '$total',
                      0
                    ]
                  }
                ]
              }
            ]
          }
        }
      },
      {
        $addFields: {
          netRevenue: {
            $max: [0, { $subtract: ['$total', '$refundAmount'] }]
          }
        }
      },
      {
        $match: {
          netRevenue: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+05:30' } },
          month: { $first: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: '+05:30' } } },
          revenue: { $sum: '$netRevenue' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $limit: 24 }
    ]);

    const summary = {
      totalRevenue,
      totalOrders: totalOrdersCount,
      totalOrdersCount,
      paidOrdersCount,
      averageOrderValue,
      totalCustomers,
      newCustomers: newCustomersCount,
      repeatCustomers: repeatCustomersCount,
      repeatCustomersCount,
      repeatCustomerRate,
      totalProducts,
      pendingOrders: pendingOrdersCount,
      confirmedOrders: confirmedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
      lowStockProducts: lowStockProductsCount,
      lowStockCount: lowStockAlerts.length
    };

    const kpis = {
      revenue: totalRevenue,
      totalRevenue,
      orders: totalOrdersCount,
      totalOrders: totalOrdersCount,
      paidOrders: paidOrdersCount,
      averageOrderValue,
      customers: totalCustomers,
      totalCustomers,
      newCustomers: newCustomersCount,
      repeatCustomers: repeatCustomersCount,
      repeatCustomerRate,
      products: totalProducts,
      totalProducts,
      pendingOrders: pendingOrdersCount,
      confirmedOrders: confirmedOrdersCount,
      cancelledOrders: cancelledOrdersCount,
      lowStockProducts: lowStockProductsCount,
      lowStockCount: lowStockAlerts.length
    };

    res.status(200).json({
      success: true,
      data: {
        summary,
        kpis,
        overview: summary,
        customerMetrics: {
          totalCustomers,
          newCustomers: newCustomersCount,
          repeatCustomers: repeatCustomersCount,
          repeatCustomerRate,
          customersWithOrders: customersWithOrdersCount
        },
        categorySales,
        categoryBreakdown: categorySales,
        lowStock: {
          count: lowStockAlerts.length,
          productsCount: lowStockProductsCount
        },
        lowStockAlerts: lowStockAlerts.slice(0, 20),
        recentOrders: recentOrders.map((ord) => ({
          _id: ord._id,
          orderNumber: ord.orderNumber,
          customer: ord.shippingAddressSnapshot?.fullName || ord.userId?.name || 'Customer',
          customerName: ord.shippingAddressSnapshot?.fullName || ord.userId?.name || 'Customer',
          customerEmail: ord.userId?.email || '',
          shippingAddress: ord.shippingAddressSnapshot,
          total: ord.total,
          totalAmount: ord.total,
          paymentMethod: ord.paymentMethod,
          paymentStatus: ord.paymentStatus,
          orderStatus: ord.orderStatus,
          createdAt: ord.createdAt,
          items: ord.items
        })),
        topProducts: topProducts.map((p) => ({
          productId: p._id,
          productName: p.name,
          brand: p.brand,
          slug: p.slug,
          categoryName: p.categoryId?.name || 'Haute Apparel',
          images: p.images,
          totalSold: p.totalSalesCount || 0,
          totalRevenue: (p.totalSalesCount || 0) * (p.variants?.[0]?.price || 0)
        })),
        lowPerformingProducts: lowPerformingProducts.map((p) => ({
          productId: p._id,
          productName: p.name,
          brand: p.brand,
          slug: p.slug,
          categoryName: p.categoryId?.name || 'Haute Apparel',
          images: p.images,
          totalSold: p.totalSalesCount || 0
        })),
        dailySales,
        monthlySales,
        revenueByDay: dailySales,
        revenueByMonth: monthlySales,
        revenueOverTime: dailySales,
        orderStatusBreakdown: statusAgg,
        statusBreakdown: statusAgg,
        paymentMethodStats,
        paymentStatusStats
      }
    });
  } catch (error) {
    next(error);
  }
};
