import { Request, Response, NextFunction } from "express";
import { JwtService } from "../services/jwt.service";

export async function authGuard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Please log in first" });
    return;
  }

  try {
    const payload = JwtService.verifyAccess(header.slice(7));
    req.user = {
      id: payload.sub!,
      email: payload.email,
      isAdmin: !!payload.isAdmin,
    };

    next();
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
  }
}
