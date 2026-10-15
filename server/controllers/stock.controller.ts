import { Request, Response } from "express";
import { createStockAdjustment, listAdjustmentRequests, listAdjustments, listLowStock, reviewStockRequest, submitStockRequest } from "../services/stock.service";
export async function list(req: Request, res: Response) { res.json({ adjustments: await listAdjustments(req.user!.role === "Admin" ? undefined : req.user!.id) }); }
export async function lowStock(req: Request, res: Response) { const products = await listLowStock(); res.json({ products: req.user!.role === "Admin" ? products : products.map(({ purchasePrice: _cost, ...safe }) => safe) }); }
export async function create(req: Request, res: Response) { res.status(201).json({ adjustment: await createStockAdjustment(req.body, req.user!.name, req.user!.id) }); }
export async function requests(req: Request, res: Response) { res.json({ requests: await listAdjustmentRequests(req.user!.role === "Admin" ? undefined : req.user!.id) }); }
export async function createRequest(req: Request, res: Response) { res.status(201).json({ request: await submitStockRequest(req.body, req.user!.name, req.user!.id) }); }
export async function review(req: Request, res: Response) { res.json({ request: await reviewStockRequest(String(req.params.id), req.body.decision, req.user!.name, req.user!.id) }); }
