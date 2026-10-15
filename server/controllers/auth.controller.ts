import { Request, Response } from "express";
import { authenticate } from "../services/auth.service";
export async function login(req: Request, res: Response) { const result = await authenticate(req.body.email, req.body.password); if (!result) return res.status(401).json({ message: "Incorrect email or password." }); res.json(result); }
export function me(req: Request, res: Response) { res.json({ user: req.user }); }
