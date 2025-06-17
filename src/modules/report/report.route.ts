import { Router, Request, Response, NextFunction } from "express";
import { authGuard } from "../../middleware/auth.guard";
import { ReportService } from "./report.service";
import { ok } from "../../common/httpResponse";
export const reportRouter = Router();

reportRouter.use(authGuard);

reportRouter.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Number(req.query.limit ?? 3);

      const { data, total, pages } = await ReportService.list(
        req.user!.id,
        page,
        limit
      );

      ok(res, data, { page, limit, pages, total });
    } catch (err) {
      next(err);
    }
  }
);

reportRouter.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await ReportService.find(req.user!.id, req.params.id);
      if (!report) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      ok(res, report);
    } catch (err) {
      next(err);
    }
  }
);

reportRouter.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await ReportService.remove(req.user!.id, req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
