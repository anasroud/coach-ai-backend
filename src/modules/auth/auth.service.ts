import { UserModel, User } from "./auth.model";
import { HashService } from "../../services/hash.service";
import { JwtService } from "../../services/jwt.service";
import { env } from "@config/env";
import jwt from "jsonwebtoken";

export const AuthService = {
  async createUser(dto: { email: string; name: string; password: string }) {
    const hash = await HashService.hash(dto.password);
    await UserModel.create({
      email: dto.email,
      name: dto.name,
      passwordHash: hash,
      refreshTokens: [],
    });
  },

  async login(dto: {
    email: string;
    name: string;
    password: string;
  }): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
    const user = await UserModel.findOne({ email: dto.email }).exec();
    if (!user || (user.isActive !== true && user.email !== env.ADMIN_EMAIL))
      return { error: "User Not Found or not yet Activated" };

    const ok = await HashService.compare(dto.password, user.passwordHash!);
    if (!ok) return { error: "Password is incorrect" };

    const accessToken = JwtService.signAccess(
      user.id,
      user.name,
      user.email,
      user.isAdmin
    );
    const refreshToken = JwtService.signRefresh(
      user.id,
      user.name,
      user.email,
      user.isAdmin
    );
    user.refreshTokens.push(refreshToken);
    await user.save();
    return { accessToken, refreshToken };
  },

  async rotateTokens(oldRt: string) {
    let payload: jwt.JwtPayload;
    try {
      payload = JwtService.verifyRefresh(oldRt);
    } catch {
      return { error: "Refresh token invalid or expired" };
    }

    const user = await UserModel.findById(payload.sub).exec();
    if (!user || !user.refreshTokens.includes(oldRt))
      return { error: "Refresh token not recognized" };

    user.refreshTokens = user.refreshTokens.filter((rt) => rt !== oldRt);

    const refreshToken = JwtService.signRefresh(
      user.id,
      user.name,
      user.email,
      user.isAdmin
    );
    user.refreshTokens.push(refreshToken);
    await user.save();

    const accessToken = JwtService.signAccess(
      user.id,
      user.name,
      user.email,
      user.isAdmin
    );
    return { accessToken, refreshToken };
  },

  async getUsers(
    pageParam: unknown,
    limitParam: unknown
  ): Promise<{
    data?: User[];
    meta?: { page: number; limit: number; pages: number; total: number };
    error?: string;
  }> {
    try {
      const page = Math.max(1, Number(pageParam) || 1);
      const limit = Math.max(1, Math.min(100, Number(limitParam) || 20));

      const total = await UserModel.countDocuments();
      const users = await UserModel.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("-passwordHash -refreshTokens");

      return {
        data: users,
        meta: {
          page,
          limit,
          pages: Math.ceil(total / limit),
          total,
        },
      };
    } catch {
      return { error: "Failed to fetch users" };
    }
  },

  async rotateActivationUser(
    activationId: string,
    isActive: boolean
  ): Promise<{ user?: User; error?: string }> {
    const user = await UserModel.findByIdAndUpdate(
      activationId,
      { isActive: !!isActive },
      { new: true, select: "-passwordHash -refreshTokens" }
    );

    if (!user) return { error: "Not found" };

    return { user };
  },
};
