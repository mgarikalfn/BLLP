import { Schema, model, Document } from "mongoose";

export interface ILocalizedText {
  am: string;
  ao: string;
}

export interface ITopic extends Document {
  title: ILocalizedText;
  description: ILocalizedText;
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  slug: string;
  thumbnailUrl?: string;
}

const localizedSchema = new Schema<ILocalizedText>(
  {
    am: { type: String, required: true },
    ao: { type: String, required: true }
  },
  { _id: false }
);

const topicSchema = new Schema<ITopic>(
  {
    title: { type: localizedSchema, required: true },
    description: { type: localizedSchema, required: true },
    level: {
      type: String,
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      required: true
    },
    slug: { type: String, required: true, unique: true },
    thumbnailUrl: { type: String }
  },
  { timestamps: true }
);

export const Topic = model<ITopic>("Topic", topicSchema);