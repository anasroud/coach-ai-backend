import jwt from "jsonwebtoken";
import { env } from "../config/env";

const ACCESS_EXP = "15m";
const REFRESH_EXP = "7d";

export const JwtService = {
  signAccess(id: string, name: string, email: string, isAdmin: boolean) {
    return jwt.sign({ sub: id, name, email, isAdmin }, env.JWT_ACCESS_SECRET, {
      expiresIn: ACCESS_EXP,
    });
  },

  signRefresh(id: string, name: string, email: string, isAdmin: boolean) {
    return jwt.sign({ sub: id, name, email, isAdmin }, env.JWT_REFRESH_SECRET, {
      expiresIn: REFRESH_EXP,
    });
  },

  verifyAccess(token: string) {
    return jwt.verify(token, env.JWT_ACCESS_SECRET) as jwt.JwtPayload;
  },

  verifyRefresh(token: string) {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as jwt.JwtPayload;
  },
};
