import { z } from "zod";
export const loginSchema = z.object({ email: z.string().trim().min(1).transform(email => email.toLowerCase()), password: z.string().min(6) });
export const staffAccountSchema = z.object({ name: z.string().trim().min(2).max(80), email: z.string().trim().email().max(254).transform(email => email.toLowerCase()), password: z.string().min(12).max(128) });
export const settingsSchema = z.object({ businessName: z.string().trim().min(2).max(100), taxRate: z.number().finite().min(0).max(100), maxDiscountPercent: z.number().finite().min(0).max(100) });
export const productSchema = z.object({ sku: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(80), category: z.string().trim().min(2).max(40), purchasePrice: z.number().finite().nonnegative(), sellingPrice: z.number().finite().nonnegative(), stock: z.number().int().nonnegative(), reorderLevel: z.number().int().nonnegative() });
export const productUpdateSchema = productSchema.omit({ stock: true }).partial();
export const adjustmentSchema = z.object({ productId: z.string().min(1), type: z.enum(["Received", "Added", "Removed"]), quantity: z.number().int().positive().max(100000), reason: z.string().trim().max(200).optional() });
export const saleSchema = z.object({ items: z.array(z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(100000) })).min(1).max(100).refine(items => new Set(items.map(item => item.productId)).size === items.length, "Each product may appear only once."), discount: z.number().finite().min(0).max(100000).default(0) });
