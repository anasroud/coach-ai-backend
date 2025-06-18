import { RequestHandler } from "express";
import { AiService } from "../../services/ai.service";
import { PromptModel } from "../prompt/prompt.model";
import { RecordingService } from "./recording.service";
import { ok } from "../../common/httpResponse";
import { presignGet } from "@services/s3.service";

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
    const { key, promptId } = req.body;
    if (!key || !promptId){
      res.status(400).json({ success: false, error: 'key and promptId required' });
      return;
    }

    let promptText = '', promptType = 'Improvisation';
    if (promptId !== 'improv') {
      const p = await PromptModel.findById(promptId).lean();
      if (!p || String(p.ownerId) !== req.user!.id) {
        res.status(404).json({ success: false, error: 'Prompt not found' });
        return;
      }
      promptText = p.text!;
      promptType = p.title;
    }

    const reportId = await RecordingService.analyse(
      key, req.user!.id, promptText, promptType
    );
    ok(res, { reportId }, 201);
  } catch (err) { next(err); }
};

export const getRecording: RequestHandler = async (req, res, next) => {
  try {
    const r = await RecordingService.getReport(req.params.id, req.user!.id);
    if (!r){ res.status(404).json({ success: false, error: 'Not found' }); return}

    const key = r.audioUrl!.replace('/', '');
    r.audioUrl = await presignGet(key, 900);
    ok(res, r);
  } catch (err) { next(err); }
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
