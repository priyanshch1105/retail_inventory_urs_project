import { Request, Response } from "express";
import { createStaffAccount, listTeamMembers, setStaffActive } from "../services/user.service";

export async function list(req: Request, res: Response) {
  const users = await listTeamMembers();
  res.json({ users: users.map(user => ({ id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active !== false })) });
}

export async function createStaff(req: Request, res: Response) {
  const user = await createStaffAccount(req.body);
  res.status(201).json({ user });
}

export async function updateStaffStatus(req: Request, res: Response) {
  const user = await setStaffActive(String(req.params.id), req.body.active);
  res.json({ user });
}
