import { Schema, model, Document, Types } from "mongoose";

export enum VideoLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

export enum YoutubeVideoStatus {
  DRAFT = "DRAFT",
  NEEDS_REVIEW = "NEEDS_REVIEW",
  PUBLISHED = "PUBLISHED",
}

export interface IYoutubeVideo extends Document {
  youtubeId: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  topicId: Types.ObjectId;
  level: VideoLevel;
  tags: string[];
  relevanceScore: number;
  isVerified: boolean;
  status: YoutubeVideoStatus;
  generatedByAI: boolean;
  authorId?: Types.ObjectId;
}

const youtubeVideoSchema = new Schema<IYoutubeVideo>(
  {
    youtubeId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    thumbnailUrl: { type: String },
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    level: {
      type: String,
      enum: Object.values(VideoLevel),
      required: true,
    },
    tags: [{ type: String }],
    relevanceScore: { type: Number, min: 0, max: 10, default: 0 },
    isVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: Object.values(YoutubeVideoStatus),
      default: YoutubeVideoStatus.DRAFT,
    },
    generatedByAI: { type: Boolean, default: true },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

youtubeVideoSchema.index({ title: "text", description: "text", tags: "text" });

export const YoutubeVideo = model<IYoutubeVideo>("YoutubeVideo", youtubeVideoSchema);
