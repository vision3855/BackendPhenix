import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, required: true, min: 0 },
    stockQuantity: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 10 },
    isArchived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Compound index for fast low-stock queries
productSchema.index({ isArchived: 1, stockQuantity: 1 });

productSchema.virtual('isLowStock').get(function () {
  return this.stockQuantity <= this.lowStockThreshold;
});

export const Product = mongoose.model('Product', productSchema);
