import { signToken, verifyCredentials, hashPassword } from "../auth";
export async function authenticate(email: string, password: string) { const user = await verifyCredentials(email, password); return user ? { user, token: signToken(user) } : null; }
export { hashPassword };
