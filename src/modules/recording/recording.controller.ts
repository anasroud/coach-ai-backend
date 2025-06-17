import { RequestHandler } from "express";
import { AiService } from "../../services/ai.service";
import { PromptModel } from "../prompt/prompt.model";
import { RecordingService } from "./recording.service";
import { ok } from "../../common/httpResponse";

export const getPrompt: RequestHandler = async (req, res, next) => {
  try {
    let promptType = "random";
    const raw = req.query.promptType;
    if (typeof raw === "string") {
      if (raw.length > 100) {
        res
          .status(400)
          .json({ success: false, error: "Prompt type ≤100 chars" });
        return;
      }
      promptType = raw;
    }

    const text = await AiService.generatePrompt(promptType);
    const prompt = await PromptModel.create({
      text,
      title: promptType,
      ownerId: req.user!.id,
    });
    ok(res, { promptId: prompt.id, title: promptType, text });
  } catch (err) {
    next(err);
  }
};

export const createRecording: RequestHandler = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: "Audio file missing" });
      return;
    }

    const promptId = String(req.body.promptId ?? "");

    let promptText = "";
    let promptType = "Improvisation";

    if (promptId) {
      const prompt = await PromptModel.findById(promptId).lean();
      if (!prompt || String(prompt.ownerId) !== req.user!.id) {
        res.status(404).json({ success: false, error: "Prompt not found" });
        return;
      }
      promptText = prompt.text!;
      promptType = prompt.title;
    }

    const reportId = await RecordingService.analyse(
      req.file,
      req.user!.id,
      promptText,
      promptType
    );

    ok(res, { reportId });
  } catch (err) {
    next(err);
  }
};

export const getRecording: RequestHandler = async (req, res, next) => {
  try {
    const report = await RecordingService.getReport(
      req.params.id,
      req.user!.id
    );
    if (!report) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    ok(res, report);
  } catch (err) {
    next(err);
  }
};

export const getUserStats: RequestHandler = async (req, res, next) => {
  try {
    const stats = await RecordingService.getStats(req.user!.id);
    ok(
      res,
      stats ?? {
        totalRecordings: 0,
        averageScore: 0,
        hoursPracticed: 0,
        improvement: 0,
      }
    );
  } catch (err) {
    next(err);
  }
};
