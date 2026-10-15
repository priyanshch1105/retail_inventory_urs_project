import mongoose, { Schema } from "mongoose";
const saleSchema = new Schema({ invoiceNumber: { type: String, unique: true, required: true }, lines: [{ productId: String, sku: String, name: String, price: Number, costPrice: Number, quantity: Number, lineTotal: Number }], subtotal: Number, discount: Number, taxRate: Number, tax: Number, total: Number, createdAt: { type: Date, default: Date.now, index: true }, userName: String, userId: { type: String, index: true } });
export const SaleModel = mongoose.models.Sale || mongoose.model("Sale", saleSchema);
