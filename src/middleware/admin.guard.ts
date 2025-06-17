import { NextFunction, Response, Request, RequestHandler } from "express";
import { env } from "../config/env";

export const adminGuard: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.user?.isAdmin || req.user?.email === env.ADMIN_EMAIL) {
    return next();
  }
  res
    .status(403)
    .json({ success: false, error: "Administrator privileges required" });
};
