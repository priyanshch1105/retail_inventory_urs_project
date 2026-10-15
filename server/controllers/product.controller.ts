import { Request, Response } from "express";
import { productService } from "../services/product.service";
function visibleProduct<T extends { purchasePrice: number }>(product: T, canSeeCost: boolean) { if (canSeeCost) return product; const { purchasePrice: _cost, ...safe } = product; return safe; }
export async function list(req: Request, res: Response) { const products = await productService.list({ search: String(req.query.search || ""), category: String(req.query.category || ""), status: String(req.query.status || "") }); res.json({ products: products.map(p => visibleProduct(p, req.user!.role === "Admin")) }); }
export async function detail(req: Request, res: Response) { const product = await productService.get(String(req.params.id)); if (!product) return res.status(404).json({ success: false, message: "Product not found.", code: "NOT_FOUND" }); res.json({ product: visibleProduct(product, req.user!.role === "Admin") }); }
export async function create(req: Request, res: Response) { res.status(201).json({ product: await productService.create(req.body) }); }
export async function update(req: Request, res: Response) { const product = await productService.update(String(req.params.id), req.body); if (!product) return res.status(404).json({ message: "Product not found." }); res.json({ product }); }
export async function deactivate(req: Request, res: Response) { const product = await productService.deactivate(String(req.params.id)); if (!product) return res.status(404).json({ message: "Product not found." }); res.json({ product }); }
