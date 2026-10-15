export { adjustmentSchema } from "../validation";
import { z } from "zod";
export const adjustmentRequestSchema = z.object({ productId: z.string().min(1), type: z.enum(["Received", "Added", "Removed"]), quantity: z.number().int().positive().max(100000), reason: z.string().trim().min(3).max(200) });
export const adjustmentDecisionSchema = z.object({ decision: z.enum(["Approved", "Rejected"]) });
