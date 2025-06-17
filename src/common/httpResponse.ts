import { Response } from "express";

export interface Success<T = unknown, M = unknown> {
  success: true;
  data: T;
  meta?: M;
}

export interface Failure {
  success: false;
  error: string;
}

export function ok<T, M = undefined>(
  res: Response,
  data: T,
  meta?: M
): Response<Success<T, M>> {
  return res.json({ success: true, data, meta });
}
