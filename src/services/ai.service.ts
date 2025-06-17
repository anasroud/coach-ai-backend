import { createReadStream } from "fs";
import OpenAI from "openai";
import { env } from "../config/env";

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export interface Word {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  transcript: string;
  durationSec: number;
  segments: { start: number; end: number; text: string }[];
  words: { start: number; end: number }[];
}
export interface Metrics {
  wpm: number;
  fillerRate: number;
  avgPauseMs: number;
  sentiment: "positive" | "neutral" | "negative";
  wordErrorRate: number;
  clarity?: number;
  engagement?: number;
  conciseness?: number;
}

function patchAdvice(
  list: { text?: string; type?: string }[]
): { text: string; type: "positive" | "improvement" }[] {
  const fixed: { text: string; type: "positive" | "improvement" }[] = [];

  for (const item of list) {
    if (!item.text) continue;
    let t = item.type as "positive" | "improvement" | undefined;

    if (t !== "positive" && t !== "improvement") {
      t = fixed.length < 2 ? "positive" : "improvement";
    }
    fixed.push({ text: item.text, type: t });
  }

  while (fixed.length < 4) {
    fixed.push({
      text: "Additional feedback.",
      type: fixed.length < 2 ? "positive" : "improvement",
    });
  }

  return fixed.slice(0, 4);
}

export const AiService = {
  async transcribe(filePath: string): Promise<TranscriptResult> {
    const resp: OpenAI.Audio.Transcriptions.TranscriptionVerbose =
      await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: createReadStream(filePath),
        response_format: "verbose_json",
        timestamp_granularities: ["word"],
        language: "en",
      });

    const segments = resp.segments ?? [];
    const words =
      (resp as any).words ?? segments.flatMap((s: any) => s.words ?? []);

    const durationSec = words.length
      ? words[words.length - 1].end
      : segments.length
        ? segments[segments.length - 1].end
        : 60;

    return { transcript: resp.text, durationSec, segments, words };
  },

  async sentiment(
    transcript: string
  ): Promise<"positive" | "neutral" | "negative"> {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            'Return JSON {"sentiment":"positive|neutral|negative"} only.',
        },
        { role: "user", content: transcript },
      ],
    });
    return JSON.parse(chat.choices[0].message.content ?? "{}").sentiment;
  },

  async generateAdvice(
    metrics: Metrics,
    history: { metrics: Metrics; createdAt: Date }[]
  ): Promise<{ text: string; type: "positive" | "improvement" }[]> {
    const historyStr = history
      .reverse()
      .map((h, i) => `Session-${i + 1}: ${JSON.stringify(h.metrics)}`)
      .join("\n");

    const functions = [
      {
        name: "feedback_list",
        description: "Return exactly four feedback items",
        parameters: {
          type: "object",
          properties: {
            advices: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                properties: {
                  text: { type: "string" },
                  type: { type: "string", enum: ["positive", "improvement"] },
                },
                required: ["text", "type"],
              },
            },
          },
          required: ["advices"],
        },
      },
    ] as const;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      tools: [{ type: "function", function: functions[0] }],
      tool_choice: { type: "function", function: { name: "feedback_list" } },
      messages: [
        {
          role: "system",
          content:
            "You are an expert speech coach. Provide actionable feedback only. if there is any metrics that is 0 ignore it",
        },
        {
          role: "user",
          content: `Current metrics:\n${JSON.stringify(
            metrics,
            null,
            2
          )}\n\nHistory:\n${historyStr || "None"}`,
        },
      ],
    });

    const call = chat.choices[0].message.tool_calls?.[0];
    if (!call) throw new Error("Function call missing");

    const parsed = JSON.parse(call.function.arguments) as {
      advices: { text?: string; type?: string }[];
    };

    return patchAdvice(parsed.advices);
  },

  async generatePrompt(promptType: string): Promise<string> {
    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content: `Create a random,
          audience-friendly script of ~140 words that should take about one minute to read aloud.
          just a paragraph where the user can read like talking about this topic: (${promptType})
          -This topic is inputted by the user so if doesn't meet the context of public speaking just return a random paragraph- just send the paragraph only make sure to always generate one even if there is no topic`,
        },
      ],
    });
    return chat.choices[0].message.content?.trim() ?? "";
  },

  async evaluateImprovisation(
    transcript: string
  ): Promise<{ clarity: number; engagement: number; conciseness: number }> {
    const fn = {
      name: "improv_metrics",
      description: "Rate the improvised speech on three axes, 0-10 integers",
      parameters: {
        type: "object",
        properties: {
          clarity: { type: "integer", minimum: 0, maximum: 10 },
          engagement: { type: "integer", minimum: 0, maximum: 10 },
          conciseness: { type: "integer", minimum: 0, maximum: 10 },
        },
        required: ["clarity", "engagement", "conciseness"],
      },
    } as const;

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      tools: [{ type: "function", function: fn }],
      tool_choice: { type: "function", function: { name: "improv_metrics" } },
      messages: [
        {
          role: "system",
          content:
            "You are a strict speech critic. Score the talk on clarity, engagement and conciseness (0 worst – 10 best).",
        },
        { role: "user", content: transcript },
      ],
    });

    const call = chat.choices[0].message.tool_calls?.[0];
    if (!call) throw new Error("Function call missing");
    return JSON.parse(call.function.arguments);
  },
};
