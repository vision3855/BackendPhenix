import mongoose from 'mongoose';

const inventoryLogSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    type: {
      type: String,
      enum: ['SALE', 'RESTOCK', 'ADJUSTMENT', 'RETURN'],
      required: true,
    },
    quantityChange: { type: Number, required: true }, // negative = stock out
    stockAfter: { type: Number, required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale', default: null },
  },
  { timestamps: true }
);

inventoryLogSchema.index({ createdAt: -1 });

export const InventoryLog = mongoose.model('InventoryLog', inventoryLogSchema);
