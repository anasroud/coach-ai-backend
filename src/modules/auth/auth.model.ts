import { InferSchemaType, Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
    passwordHash: { type: String },
    refreshTokens: { type: [String], default: [] },
    isAdmin: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);
export type User = InferSchemaType<typeof userSchema>;

export const UserModel = model("User", userSchema);
