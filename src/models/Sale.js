import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true }, // denormalized snapshot
    sku: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    items: { type: [saleItemSchema], required: true, validate: (v) => v.length > 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'mobile_money', 'other'],
      default: 'cash',
    },
    soldAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Supports fast aggregation by day for dashboards
saleSchema.index({ soldAt: 1, cashier: 1 });

export const Sale = mongoose.model('Sale', saleSchema);
