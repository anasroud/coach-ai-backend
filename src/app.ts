import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "@modules/auth/auth.route";
import { reportRouter } from "@modules/report/report.route";
import { recordingRouter } from "@modules/recording/recording.route";
import path from "path";
import { env } from "@config/env";
import { uploadRouter } from "@modules/recording/upload.route";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CLIENT_ORIGIN,
      credentials: false,
      allowedHeaders: ["Content-Type", "Authorization"],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    })
  );

  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  app.use("/auth", authRouter);
  app.use(
    "/uploads",
    cors({ origin: env.CLIENT_ORIGIN! }),
    express.static(path.join(__dirname, "../uploads"), {
      setHeaders: (res) => {
        res.setHeader("Access-Control-Allow-Origin", env.CLIENT_ORIGIN);
        res.setHeader("Access-Control-Allow-Headers", "Range");
        res.setHeader("Accept-Ranges", "bytes");
      },
    })
  );

  app.use('/upload', uploadRouter);
  app.use("/recording", recordingRouter);
  app.use("/reports", reportRouter);

  return app;
}
