import mongoose from 'mongoose';

const InventoryMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product reference is required'],
    index: true
  },
  variantSku: {
    type: String,
    required: [true, 'Variant SKU is required'],
    uppercase: true,
    trim: true,
    index: true
  },
  quantityChange: {
    type: Number,
    required: [true, 'Quantity change is required']
  },
  previousStock: {
    type: Number,
    required: [true, 'Previous stock count is required']
  },
  newStock: {
    type: Number,
    required: [true, 'New stock count is required']
  },
  reason: {
    type: String,
    enum: [
      'initial_creation',
      'restock',
      'order_placed',
      'order_cancelled',
      'return_restock',
      'manual_adjustment',
      'damaged_writeoff'
    ],
    required: [true, 'Inventory adjustment reason is required']
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    default: null
  },
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  note: {
    type: String,
    default: '',
    trim: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

export const InventoryMovement = mongoose.model('InventoryMovement', InventoryMovementSchema);
export default InventoryMovement;
