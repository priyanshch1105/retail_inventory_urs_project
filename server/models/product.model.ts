import mongoose, { Schema } from "mongoose";
const productSchema = new Schema({ sku: { type: String, required: true, unique: true, trim: true, uppercase: true }, name: { type: String, required: true, trim: true }, category: { type: String, required: true, trim: true, index: true }, purchasePrice: { type: Number, required: true, min: 0 }, sellingPrice: { type: Number, required: true, min: 0 }, stock: { type: Number, required: true, min: 0, default: 0 }, reorderLevel: { type: Number, required: true, min: 0 }, active: { type: Boolean, default: true, index: true } }, { timestamps: true });
productSchema.index({ active: 1, name: 1 });
export const ProductModel = mongoose.models.Product || mongoose.model("Product", productSchema);
