import mongoose, { Schema } from "mongoose";

const settingsSchema = new Schema({
  key: { type: String, unique: true, required: true, default: "business" },
  businessName: { type: String, required: true, default: "Stockroom" },
  taxRate: { type: Number, required: true, default: 0, min: 0, max: 100 },
  maxDiscountPercent: { type: Number, required: true, default: 100, min: 0, max: 100 },
}, { timestamps: true });

export const SettingsModel = mongoose.models.RetailSettings || mongoose.model("RetailSettings", settingsSchema);
