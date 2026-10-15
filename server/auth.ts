import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { findUserByEmail, isUserActive, Role } from "./store";
import { env } from "./config/env";
const secret = () => { if (!env.jwtSecret || env.jwtSecret.length < 32) throw new Error("JWT_SECRET must contain at least 32 characters."); return env.jwtSecret; };
export type AuthUser = { id: string; name: string; email: string; role: Role };
export function signToken(user: AuthUser) { return jwt.sign(user, secret(), { expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"] }); }
export async function verifyCredentials(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role } satisfies AuthUser;
}
export async function authRequired(req: Request, res: Response, next: NextFunction) { const header = req.headers.authorization; if (!header?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required.", code: "UNAUTHENTICATED" }); try { const user = jwt.verify(header.slice(7), secret()) as AuthUser; if (!user.id || !["Admin", "Staff"].includes(user.role) || !(await isUserActive(user.id))) throw new Error("invalid or inactive account"); req.user = user; next(); } catch { return res.status(401).json({ success: false, message: "Invalid, expired, or deactivated session. Please sign in again.", code: "UNAUTHENTICATED" }); } }
export function allowRoles(...roles: Role[]) { return (req: Request, res: Response, next: NextFunction) => { if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ message: "You do not have permission for this action." }); next(); }; }
export async function hashPassword(password: string) { return bcrypt.hash(password, 10); }
declare global { namespace Express { interface Request { user?: AuthUser } } }
