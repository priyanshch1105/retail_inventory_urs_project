import { Request, Response } from "express";
import { getBusinessSettings, saveBusinessSettings } from "../services/settings.service";
export async function get(_req: Request, res: Response) { res.json({ settings: await getBusinessSettings() }); }
export async function update(req: Request, res: Response) { res.json({ settings: await saveBusinessSettings(req.body) }); }
