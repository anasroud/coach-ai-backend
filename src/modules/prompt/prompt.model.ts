import { InferSchemaType, Schema, model } from "mongoose";
export const promptSchema = new Schema(
  {
    text: String,
    title: { type: String, required: true },
    ownerId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type Prompt = InferSchemaType<typeof promptSchema>;

export const PromptModel = model("Prompt", promptSchema);
