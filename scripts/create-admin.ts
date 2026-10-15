import "dotenv/config";
import mongoose from "mongoose";
import { UserModel } from "../server/models/user.model";
import { hashPassword } from "../server/auth";

async function main() {
  const { MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, JWT_SECRET } = process.env;
  if (!MONGODB_URI || !ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || !JWT_SECRET || JWT_SECRET.length < 32) throw new Error("Set MONGODB_URI, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD and a 32+ character JWT_SECRET.");
  if (ADMIN_PASSWORD.length < 12) throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
  await mongoose.connect(MONGODB_URI);
  try {
    const email = ADMIN_EMAIL.trim().toLowerCase();
    if (await UserModel.findOne({ email })) throw new Error("An account already exists for this email; refusing to create a duplicate Admin.");
    await UserModel.create({ name: ADMIN_NAME.trim(), email, passwordHash: await hashPassword(ADMIN_PASSWORD), role: "Admin" });
    console.log(`Initial Admin created for ${email}.`);
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Admin provisioning failed."); process.exitCode = 1; });
