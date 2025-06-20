import levenshtein from "js-levenshtein";
import { AiService, Metrics } from "../../services/ai.service";
import { ReportModel } from "../report/report.model";
import { ReportService } from "../report/report.service";
import { Types } from "mongoose";
import fs from 'fs/promises';
import { downloadToTmp } from '../../services/s3.service';

const FILLERS = "um+|uh+|er+|ah+|like|you know|I mean|well|so|actually|basically|literally|kind of|sort of|right|okay|you see|hmm+|huh+|mm+|mmm+|يعني+|اه+|مم+|ام+|شو+|اوك|طيب|خلينا|اصلا|فيعني|ها|ااا|اهه|والله|فهمت|ايش|اوكي|همم|مثلا|هيك|يعني يعني";
const FILLERS_REGEX = new RegExp(`\\b(${FILLERS})\\b`, 'gi');

function wordErrorRate(expected: string, actual: string) {
  const ref = expected.toLowerCase().split(/\s+/);
  const hyp = actual.toLowerCase().split(/\s+/);
  return (levenshtein(ref.join(" "), hyp.join(" ")) / ref.length) * 100;
}

function fillerRate(text: string) {
  const total = text.split(/\s+/).length;
  const fillers = (text.match(FILLERS_REGEX) ?? []).length;
  return (fillers / total) * 100;
}

function gapStats(timeline: { start: number; end: number }[], minGap = 0.25) {
  if (timeline.length < 2) return { avgPauseMs: 0, longPauses: 0 };

  const gaps = [];
  for (let i = 1; i < timeline.length; i++) {
    const gap = timeline[i].start - timeline[i - 1].end;
    if (gap >= minGap) gaps.push(gap);
  }
  const avgPauseMs = gaps.length
    ? (gaps.reduce((a, b) => a + b) / gaps.length) * 1000
    : 0;
  const longPauses = gaps.filter((g) => g >= 1.0).length;
  return { avgPauseMs, longPauses };
}

export const RecordingService = {
  async analyse(
    key: string,
    userId: string,
    promptText: string,
    promptType: string
  ): Promise<string> {
    const tmp = `/tmp/${Date.now()}.webm`;
    await downloadToTmp(key, tmp);

    const { transcript, durationSec, segments, words } =
      await AiService.transcribe(tmp, "auto");

    await fs.unlink(tmp);
    const wordsTotal = transcript.split(/\s+/).filter(Boolean).length;
    const wpm = durationSec ? Math.round((wordsTotal / durationSec) * 60) : 0;
    const { avgPauseMs, longPauses } = gapStats(
      words.length ? words : segments
    );

    const metrics: Metrics = {
      wpm,
      fillerRate: fillerRate(transcript),
      avgPauseMs,
      wordErrorRate: promptText ? wordErrorRate(promptText, transcript) : 0,
      sentiment: await AiService.sentiment(transcript),
    };

    if (promptType === "Improvise") {
      const { clarity, engagement, conciseness } =
        await AiService.evaluateImprovisation(transcript);

      Object.assign(metrics, { clarity, engagement, conciseness });
    }

    const contentPenalty =
      promptType === "Improvise"
        ? (10 -
            (metrics.clarity ?? 0) +
            10 -
            (metrics.engagement ?? 0) +
            10 -
            (metrics.conciseness ?? 0)) *
          0.7
        : 0;

    const penalty =
      Math.abs(wpm - 135) * 0.4 +
      metrics.fillerRate * 1.5 +
      (promptText ? metrics.wordErrorRate * 0.5 : 0) +
      longPauses * 2 +
      Math.abs(avgPauseMs - 400) / 40 +
      contentPenalty;

    const score = Math.max(0, 100 - penalty);

    const history = await ReportService.lastNMetrics(userId, 5);

    const cleaned = history.map((h): { metrics: Metrics; createdAt: Date } => {
      const m = h.metrics as Record<string, unknown>;

      return {
        createdAt: h.createdAt,
        metrics: {
          wpm: (m.wpm as number | undefined) ?? 0,
          fillerRate: (m.fillerRate as number | undefined) ?? 0,
          avgPauseMs: (m.avgPauseMs as number | undefined) ?? 0,
          wordErrorRate: (m.wordErrorRate as number | undefined) ?? 0,
          sentiment: (m.sentiment as Metrics["sentiment"]) ?? "neutral",
          clarity: (m.clarity as number | undefined) ?? 0,
          engagement: (m.engagement as number | undefined) ?? 0,
          conciseness: (m.conciseness as number | undefined) ?? 0,
        },
      };
    });
    const advice = await AiService.generateAdvice(metrics, cleaned);
    const audioUrl = `/${key}`;

    const report = await ReportModel.create({
      ownerId: userId,
      promptText,
      title: promptType,
      audioUrl,
      transcript,
      metrics: { ...metrics, longPauses, score },
      advice,
    });

    return report.id as string;
  },

  getReport(reportId: string, userId: string) {
    return ReportModel.findOne({ _id: reportId, ownerId: userId }).lean();
  },

  async getStats(userId: string) {
    const uid = new Types.ObjectId(userId);

    const [stats] = await ReportModel.aggregate([
      { $match: { ownerId: uid } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          avgScore: { $avg: "$metrics.score" },
          firstScore: { $first: "$metrics.score" },
          lastScore: { $last: "$metrics.score" },
          totalSeconds: {
            $sum: { $divide: [{ $strLenCP: "$transcript" }, 2.5] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalRecordings: "$total",
          averageScore: { $round: ["$avgScore", 0] },
          hoursPracticed: {
            $round: [{ $divide: ["$totalSeconds", 3600] }, 1],
          },
          improvement: { $subtract: ["$lastScore", "$firstScore"] },
        },
      },
    ]);

    return stats;
  },
};
