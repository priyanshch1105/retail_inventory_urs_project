import mongoose, { Schema } from "mongoose";
const userSchema = new Schema({ name: { type: String, required: true }, email: { type: String, unique: true, required: true, lowercase: true, trim: true }, passwordHash: { type: String, required: true, select: false }, role: { type: String, enum: ["Admin", "Staff"], required: true }, active: { type: Boolean, default: true } });
export const UserModel = mongoose.models.RetailUser || mongoose.model("RetailUser", userSchema);
