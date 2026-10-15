import { Request, Response } from "express";
import { createRetailSale, getSaleById, listSalesForUser } from "../services/sale.service";
function visibleSale<T extends { lines: { costPrice?: number }[] }>(sale: T, canSeeCost: boolean) { if (canSeeCost) return sale; return { ...sale, lines: sale.lines.map(({ costPrice: _cost, ...line }) => line) }; }
export async function list(req: Request, res: Response) { const sales = await listSalesForUser(req.user!.id, req.user!.role); res.json({ sales: sales.map(sale => visibleSale(sale, req.user!.role === "Admin")) }); }
export async function detail(req: Request, res: Response) { const sale = await getSaleById(String(req.params.id)); if (!sale || (req.user!.role === "Staff" && sale.userId !== req.user!.id)) return res.status(404).json({ success: false, message: "Sale not found.", code: "NOT_FOUND" }); res.json({ sale: visibleSale(sale, req.user!.role === "Admin") }); }
export async function create(req: Request, res: Response) { const sale = await createRetailSale(req.body, req.user!.name, req.user!.id); res.status(201).json({ sale: visibleSale(sale, req.user!.role === "Admin") }); }
