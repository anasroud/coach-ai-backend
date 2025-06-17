import { InferSchemaType, Schema, model } from "mongoose";

const metricsSchema = new Schema(
  {
    wpm: Number,
    fillerRate: Number,
    avgPauseMs: Number,
    sentiment: String,
    score: Number,
    wordErrorRate: Number,
  },
  { _id: false }
);

const adviceSchema = new Schema(
  {
    text: { type: String, required: true },
    type: { type: String, enum: ["positive", "improvement"], required: true },
  },
  { _id: false }
);

const reportSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
    audioUrl: String,
    transcript: String,
    title: { type: String, required: true },
    metrics: metricsSchema,
    promptText: String,
    advice: { type: [adviceSchema], default: [] },
  },
  { timestamps: true }
);

export type Report = InferSchemaType<typeof reportSchema>;
export type Metrics = InferSchemaType<typeof metricsSchema>;

export const ReportModel = model("Report", reportSchema);
