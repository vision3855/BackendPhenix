import mongoose from 'mongoose';
import { Sale } from '../models/Sale.js';
import { Product } from '../models/Product.js';
import { InventoryLog } from '../models/InventoryLog.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Processes a sale atomically:
 *  1. Locks & validates every product (exists, not archived, enough stock)
 *  2. Decrements stock with a conditional update (race-safe)
 *  3. Records the sale + inventory logs
 * If ANY step fails, the entire transaction is rolled back — inventory
 * and sales records can never drift out of sync.
 */
export async function createSale({ items, cashierId, paymentMethod }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleItems = [];
    let totalAmount = 0;

    for (const item of items) {
      // Lock the product document within the transaction
      const product = await Product.findOne({
        _id: item.productId,
        isArchived: false,
      }).session(session);

      if (!product) {
        throw ApiError.badRequest(`Product ${item.productId} not found or archived`);
      }

      // Atomic, race-safe decrement: only succeeds if enough stock remains
      const updated = await Product.findOneAndUpdate(
        {
          _id: product._id,
          stockQuantity: { $gte: item.quantity },
        },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true, session }
      );

      if (!updated) {
        throw ApiError.conflict(
          `Insufficient stock for "${product.name}" (available: ${product.stockQuantity})`
        );
      }

      const lineTotal = product.sellingPrice * item.quantity;
      totalAmount += lineTotal;

      saleItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice, // snapshot so profit stays accurate if cost changes
        quantity: item.quantity,
        lineTotal,
      });

      await InventoryLog.create(
        [
          {
            product: product._id,
            type: 'SALE',
            quantityChange: -item.quantity,
            stockAfter: updated.stockQuantity,
            note: `Sale item (${product.sku})`,
            performedBy: cashierId,
          },
        ],
        { session }
      );
    }

    const [sale] = await Sale.create(
      [{ items: saleItems, totalAmount, cashier: cashierId, paymentMethod }],
      { session }
    );

    // Link logs to the sale
    await InventoryLog.updateMany(
      { performedBy: cashierId, sale: null, type: 'SALE' },
      { $set: { sale: sale._id } },
      { session }
    );

    await session.commitTransaction();
    return sale;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
}
