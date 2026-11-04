import mongoose from 'mongoose';

const VariantSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    uppercase: true,
    trim: true
  },
  size: {
    type: String,
    required: [true, 'Size is required'],
    enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36', '38', 'One Size'],
    trim: true
  },
  color: {
    name: { type: String, required: [true, 'Color name is required'], trim: true },
    hexCode: {
      type: String,
      required: [true, 'Color hex code is required'],
      match: [/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Invalid color hex code format']
    }
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price must be non-negative']
  },
  compareAtPrice: {
    type: Number,
    min: [0, 'Compare price must be non-negative'],
    default: null
  },
  stockQuantity: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [150, 'Product name cannot exceed 150 characters']
  },
  slug: {
    type: String,
    required: [true, 'Slug is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category reference is required'],
    index: true
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true,
    index: true
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'unisex'],
    required: [true, 'Gender classification is required'],
    index: true
  },
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  images: [{
    url: { type: String, required: [true, 'Image URL is required'] },
    public_id: { type: String, default: '' },
    altText: { type: String, default: '' },
    isPrimary: { type: Boolean, default: false }
  }],
  variants: [VariantSchema],
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  totalSalesCount: {
    type: Number,
    default: 0,
    index: true
  },
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  reviewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Unique index on variant SKU across the entire product catalog
ProductSchema.index({ 'variants.sku': 1 }, { unique: true, sparse: true });

// Text search index for catalog query tokenization
ProductSchema.index({
  name: 'text',
  brand: 'text',
  tags: 'text',
  description: 'text'
}, {
  weights: {
    name: 10,
    brand: 5,
    tags: 3,
    description: 1
  }
});

// Compound index for faceted catalog browsing and sorting
ProductSchema.index({ categoryId: 1, gender: 1, isActive: 1 });
ProductSchema.index({ 'variants.price': 1, isActive: 1 });

export const Product = mongoose.model('Product', ProductSchema);
export default Product;
