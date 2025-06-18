import { Router } from "express";
import { authGuard } from "../../middleware/auth.guard";
import {
  getPrompt,
  createRecording,
  getRecording,
  getUserStats,
} from "./recording.controller";


export const recordingRouter = Router();
recordingRouter.get("/prompt", authGuard, getPrompt);
recordingRouter.get("/stats", authGuard, getUserStats);

recordingRouter.post("/", authGuard, createRecording);
recordingRouter.get("/:id", authGuard, getRecording);
