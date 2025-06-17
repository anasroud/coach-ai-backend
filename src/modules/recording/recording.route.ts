import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuid } from "uuid";
import { authGuard } from "../../middleware/auth.guard";
import {
  getPrompt,
  createRecording,
  getRecording,
  getUserStats,
} from "./recording.controller";

const UPLOAD_DIR = path.join(__dirname, "../../../uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) =>
    cb(null, `${uuid()}${path.extname(file.originalname) || ".wav"}`),
});
const upload = multer({ storage });

export const recordingRouter = Router();
recordingRouter.get("/prompt", authGuard, getPrompt);
recordingRouter.get("/stats", authGuard, getUserStats);

recordingRouter.post("/", authGuard, upload.single("audio"), createRecording);
recordingRouter.get("/:id", authGuard, getRecording);
