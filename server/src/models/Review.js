import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User reference is required'],
    index: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'Order reference is required']
  },
  rating: {
    type: Number,
    required: [true, 'Rating is required'],
    min: [1, 'Minimum rating is 1'],
    max: [5, 'Maximum rating is 5']
  },
  title: {
    type: String,
    required: [true, 'Review title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  comment: {
    type: String,
    required: [true, 'Review comment is required'],
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  isVerifiedPurchase: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'approved',
    index: true
  },
  isApproved: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Enforce one review per product per customer
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });

// Compound index for review browsing and moderation filtering
ReviewSchema.index({ productId: 1, isApproved: 1, status: 1, createdAt: -1 });
ReviewSchema.index({ status: 1, rating: 1, createdAt: -1 });

// Static method to recalculate product's average rating and total review count
ReviewSchema.statics.calculateAverageRating = async function(productId) {
  if (!productId) return;

  const objectId = typeof productId === 'string' ? new mongoose.Types.ObjectId(productId) : productId;

  const stats = await this.aggregate([
    {
      $match: {
        productId: objectId,
        $or: [
          { status: 'approved' },
          { isApproved: true, status: { $ne: 'rejected' } }
        ]
      }
    },
    {
      $group: {
        _id: '$productId',
        reviewCount: { $sum: 1 },
        averageRating: { $avg: '$rating' }
      }
    }
  ]);

  const Product = mongoose.model('Product');

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(objectId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount
    });
  } else {
    await Product.findByIdAndUpdate(objectId, {
      averageRating: 0,
      reviewCount: 0
    });
  }
};

// Post-save hook to recalculate product rating stats
ReviewSchema.post('save', async function() {
  await this.constructor.calculateAverageRating(this.productId);
});

// Post-remove/delete hooks to recalculate product rating stats
ReviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc && doc.productId) {
    await doc.constructor.calculateAverageRating(doc.productId);
  }
});

ReviewSchema.post('deleteOne', { document: true, query: false }, async function() {
  await this.constructor.calculateAverageRating(this.productId);
});

export const Review = mongoose.model('Review', ReviewSchema);
export default Review;
