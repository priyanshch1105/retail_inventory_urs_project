import { SettingsModel } from "../models/settings.model";

const defaults = { key: "business", businessName: "Stockroom", taxRate: 0, maxDiscountPercent: 100 };
type BusinessSettings = { businessName: string; taxRate: number; maxDiscountPercent: number };
export async function getBusinessSettings() {
  const settings = await SettingsModel.findOneAndUpdate({ key: "business" }, { $setOnInsert: defaults }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean() as BusinessSettings | null;
  if (!settings) throw new Error("Business settings could not be loaded.");
  return { businessName: settings.businessName, taxRate: settings.taxRate, maxDiscountPercent: settings.maxDiscountPercent };
}
export async function saveBusinessSettings(input: { businessName: string; taxRate: number; maxDiscountPercent: number }) {
  const settings = await SettingsModel.findOneAndUpdate({ key: "business" }, { $set: input, $setOnInsert: { key: "business" } }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean() as BusinessSettings | null;
  if (!settings) throw new Error("Business settings could not be saved.");
  return { businessName: settings.businessName, taxRate: settings.taxRate, maxDiscountPercent: settings.maxDiscountPercent };
}
