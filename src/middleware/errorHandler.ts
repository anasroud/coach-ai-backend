import { Request, Response, NextFunction } from "express";
import { Failure } from "../common/httpResponse";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response<Failure>,
  _next: NextFunction
) {
  const status =
    err instanceof Error && (err as unknown as { status: number }).status
      ? (err as unknown as { status: number }).status
      : 500;
  const msg = err instanceof Error ? err.message : "Internal Server Error";
  res.status(status).json({ success: false, error: msg });
}
