import { UserModel } from "../models/user.model";
import { hashPassword } from "../auth";

export async function listTeamMembers() {
  return UserModel.find({}, { name: 1, email: 1, role: 1, active: 1 }).sort({ name: 1 }).lean();
}

export async function setStaffActive(id: string, active: boolean) {
  const user = await UserModel.findOneAndUpdate({ _id: id, role: "Staff" }, { $set: { active } }, { new: true, runValidators: true });
  if (!user) { const error = new Error("Staff account not found."); (error as Error & { status?: number }).status = 404; throw error; }
  return { id: String(user._id), name: user.name, email: user.email, role: user.role, active: user.active };
}

export async function createStaffAccount(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) {
    const error = new Error("An account already exists for this email.");
    (error as Error & { status?: number; code?: string }).status = 409;
    (error as Error & { status?: number; code?: string }).code = "DUPLICATE_ACCOUNT";
    throw error;
  }
  const user = await UserModel.create({ name: input.name.trim(), email, passwordHash: await hashPassword(input.password), role: "Staff" });
  return { id: String(user._id), name: user.name, email: user.email, role: user.role };
}
