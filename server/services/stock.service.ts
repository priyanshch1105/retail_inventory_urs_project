import { decideAdjustmentRequest, listAdjustmentRequests, listAdjustments, listProducts, recordAdjustment, requestAdjustment } from "../repositories/inventory.repository";
export async function createStockAdjustment(input: { productId: string; type: "Received" | "Added" | "Removed"; quantity: number; reason?: string }, userName: string, userId: string) { const fallbackReason = input.type === "Received" ? "Stock received" : "Manual stock adjustment"; const adjustment = await recordAdjustment(input.productId, input.type, input.quantity, userName, input.reason || fallbackReason, userId); if (!adjustment) throw new Error("Product not found."); return adjustment; }
export async function submitStockRequest(input: { productId: string; type: "Received" | "Added" | "Removed"; quantity: number; reason: string }, userName: string, userId: string) { return requestAdjustment(input, userName, userId); }
export async function reviewStockRequest(id: string, decision: "Approved" | "Rejected", reviewerName: string, reviewerId: string) { return decideAdjustmentRequest(id, decision, reviewerName, reviewerId); }
export { listAdjustmentRequests };
export { listAdjustments };
export async function listLowStock() { return listProducts({ status: "Low" }); }
