import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';

export async function adjustStock({ productId, quantityChange, type, note, userId, session = null }) {
  const product = await Product.findById(productId).session(session);
  if (!product) throw ApiError.notFound('Product not found');

  const nextStock = product.stockQuantity + quantityChange;
  if (nextStock < 0) {
    throw ApiError.conflict(`Adjustment would make stock negative (current: ${product.stockQuantity})`);
  }

  product.stockQuantity = nextStock;
  await product.save({ session });

  await InventoryLog.create(
    [{ product: product._id, type, quantityChange, stockAfter: nextStock, note, performedBy: userId }],
    { session }
  );

  return product;
}

export async function archiveProduct(productId, userId) {
  const product = await Product.findByIdAndUpdate(
    productId,
    { isArchived: true },
    { new: true }
  );
  if (!product) throw ApiError.notFound('Product not found');

  await InventoryLog.create([
    { product: product._id, type: 'ADJUSTMENT', quantityChange: 0, stockAfter: product.stockQuantity, note: 'Product archived', performedBy: userId },
  ]);
  return product;
}
