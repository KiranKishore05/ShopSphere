import User from '../models/User.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * GET /api/v1/admin/customers
 * Paginated list of registered customers with lifetime spend and order metrics.
 * Strictly scoped to role === 'customer'.
 */
export const getAdminCustomers = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    // Base match strictly scoped to customers only
    const match = { role: 'customer' };

    // Status filter
    if (req.query.status === 'active') {
      match.isActive = true;
    } else if (req.query.status === 'inactive') {
      match.isActive = false;
    }

    // Search filter across name, email, and phone
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search.trim(), 'i');
      match.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    // Registration date range filter
    if (req.query.startDate || req.query.endDate) {
      match.createdAt = {};
      if (req.query.startDate) match.createdAt.$gte = new Date(req.query.startDate);
      if (req.query.endDate) match.createdAt.$lte = new Date(req.query.endDate);
    }

    // Aggregation pipeline to join orders and compute settled spending
    const aggregationPipeline = [
      { $match: match },
      {
        $lookup: {
          from: 'orders',
          localField: '_id',
          foreignField: 'userId',
          as: 'customerOrders'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          phone: 1,
          role: 1,
          isActive: 1,
          savedAddressesCount: { $size: { $ifNull: ['$savedAddresses', []] } },
          createdAt: 1,
          updatedAt: 1,
          totalOrders: { $size: '$customerOrders' },
          lifetimeSpend: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$customerOrders',
                    as: 'ord',
                    cond: {
                      $or: [
                        { $eq: ['$$ord.paymentStatus', 'paid'] },
                        {
                          $and: [
                            { $eq: ['$$ord.paymentMethod', 'cod'] },
                            { $eq: ['$$ord.orderStatus', 'delivered'] }
                          ]
                        }
                      ]
                    }
                  }
                },
                as: 'settled',
                in: '$$settled.total'
              }
            }
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          items: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const [facetResult, kpiCounts] = await Promise.all([
      User.aggregate(aggregationPipeline),
      Promise.all([
        User.countDocuments({ role: 'customer' }),
        User.countDocuments({ role: 'customer', isActive: true }),
        User.countDocuments({ role: 'customer', isActive: false })
      ])
    ]);

    const total = facetResult[0]?.metadata[0]?.total || 0;
    const items = facetResult[0]?.items || [];

    // Calculate total settled revenue across all customers
    const revenueAgg = await Order.aggregate([
      {
        $match: {
          $or: [
            { paymentStatus: 'paid' },
            { paymentMethod: 'cod', orderStatus: 'delivered' }
          ]
        }
      },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
    ]);
    const totalCustomerRevenue = revenueAgg[0]?.totalRevenue || 0;

    res.status(200).json({
      success: true,
      data: {
        items,
        customers: items,
        summary: {
          totalCustomers: kpiCounts[0],
          activeCustomers: kpiCounts[1],
          deactivatedCustomers: kpiCounts[2],
          totalCustomerRevenue
        },
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
 * GET /api/v1/admin/customers/:id
 * Detailed customer dossier including saved addresses, complete order history, and safe payment references.
 */
export const getAdminCustomerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select('-passwordHash -passwordResetToken -passwordResetExpires')
      .lean();

    if (!user || user.role !== 'customer') {
      return next(new AppError('Customer profile not found in patron directory.', 404, 'CUSTOMER_NOT_FOUND'));
    }

    // Retrieve full order history
    const orders = await Order.find({ userId: id })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch linked payment records for all orders of this customer
    const orderIds = orders.map(o => o._id);
    const payments = await Payment.find({ orderId: { $in: orderIds } })
      .select('orderId razorpayOrderId razorpayPaymentId paymentStatus amount currency verifiedAt failureReason createdAt')
      .lean();

    const paymentMap = payments.reduce((acc, p) => {
      acc[p.orderId.toString()] = p;
      return acc;
    }, {});

    // Attach sanitized payment records and format orders
    const enrichedOrders = orders.map(ord => ({
      ...ord,
      paymentRecord: paymentMap[ord._id.toString()] || null
    }));

    // Financial metrics
    const settledOrders = orders.filter(
      o => o.paymentStatus === 'paid' || (o.paymentMethod === 'cod' && o.orderStatus === 'delivered')
    );
    const lifetimeSpend = settledOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const completedOrdersCount = orders.filter(o => o.orderStatus === 'delivered').length;
    const cancelledOrdersCount = orders.filter(o => o.orderStatus === 'cancelled').length;
    const averageOrderValue = settledOrders.length > 0 ? Math.round(lifetimeSpend / settledOrders.length) : 0;

    res.status(200).json({
      success: true,
      data: {
        customer: user,
        summary: {
          totalOrders: orders.length,
          completedOrders: completedOrdersCount,
          cancelledOrders: cancelledOrdersCount,
          lifetimeSpend,
          averageOrderValue,
          firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
          lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
        },
        orders: enrichedOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/admin/customers/:id/status
 * Activate or deactivate customer accounts.
 * Includes strict safety guards against self-deactivation and modifying administrators.
 */
export const updateAdminCustomerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive, reason } = req.body;

    // Safety Guard 1: Prevent self-modification
    if (req.user._id.toString() === id.toString()) {
      return next(
        new AppError('Administrators cannot modify or deactivate their own account.', 400, 'CANNOT_MODIFY_OWN_ACCOUNT')
      );
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return next(new AppError('Customer profile not found.', 404, 'CUSTOMER_NOT_FOUND'));
    }

    // Safety Guard 2: Prevent modifying other administrator accounts through customer APIs
    if (targetUser.role === 'admin') {
      return next(
        new AppError('Administrator accounts cannot be modified through the customer management module.', 403, 'CANNOT_MODIFY_ADMIN_ACCOUNT')
      );
    }

    targetUser.isActive = Boolean(isActive);
    await targetUser.save();

    res.status(200).json({
      success: true,
      data: {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          phone: targetUser.phone,
          role: targetUser.role,
          isActive: targetUser.isActive,
          updatedAt: targetUser.updatedAt
        },
        message: `Customer account '${targetUser.email}' has been ${targetUser.isActive ? 'activated' : 'deactivated'}.${reason ? ` Reason: ${reason}` : ''}`
      }
    });
  } catch (error) {
    next(error);
  }
};

