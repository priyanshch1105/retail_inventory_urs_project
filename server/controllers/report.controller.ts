import { Request, Response } from "express";
import { getProfitReport, getSalesReport } from "../services/report.service";
export async function sales(req: Request, res: Response) { const report = await getSalesReport(String(req.query.from || "") || undefined, String(req.query.to || "") || undefined, req.user!.role === "Admin" ? undefined : req.user!.id); res.json({ ...report, lowStock: req.user!.role === "Admin" ? report.lowStock : report.lowStock.map(({ purchasePrice: _cost, ...safe }) => safe) }); }
export async function profit(req: Request, res: Response) { res.json(await getProfitReport(String(req.query.from || "") || undefined, String(req.query.to || "") || undefined)); }
