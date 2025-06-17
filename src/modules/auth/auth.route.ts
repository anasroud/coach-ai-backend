import { Router, Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { ok } from "../../common/httpResponse";
import { authGuard } from "@middleware/auth.guard";
import { adminGuard } from "@middleware/admin.guard";

export const authRouter = Router();

authRouter.post(
  "/signup",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await AuthService.createUser(req.body);
      ok(res, { message: "Account created" });
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post(
  "/signin",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tokens = await AuthService.login(req.body);
      if (tokens?.error && !tokens.accessToken)
        res.status(401).json({ success: false, ...tokens });
      ok(res, tokens);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.patch(
  "/users/:id",
  authGuard,
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.params.id;
      const isActive = req.body.isActive;
      const result = await AuthService.rotateActivationUser(userId, isActive);
      if (!result || result?.error)
        res.status(401).json({ success: false, error: result.error });

      if (result.user) ok(res, result);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.get(
  "/users",
  authGuard,
  adminGuard,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = req.params.page;
      const limit = req.params.limit;
      const results = await AuthService.getUsers(page, limit);
      if (!results || results.error) {
        res.status(401).json({ success: false, error: results.error });
      }

      if (results) ok(res, results.data, results.meta);
    } catch (err) {
      next(err);
    }
  }
);

authRouter.post("/refresh", async (req: Request, res: Response) => {
  const { refreshToken: oldRt } = req.body;

  if (!oldRt) {
    res.status(401).json({ success: false, error: "Refresh token missing" });
    return;
  }

  const { accessToken, refreshToken, error } =
    await AuthService.rotateTokens(oldRt);
  if (error) {
    res.status(401).json({ success: false, error });
    return;
  }

  ok(res, { accessToken, refreshToken });
});
