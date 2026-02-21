import { Schema, model, Document, Types } from "mongoose";

export interface ILocalizedText {
  am: string;
  ao: string;
}

export interface IQuizQuestion {
  question: ILocalizedText;
  options: ILocalizedText[];
  correctAnswerIndex: number;
}

export interface ILesson extends Document {
  topicId: Types.ObjectId;
  order: number;
  content: ILocalizedText;
  audioUrl?: string;
  writingPrompt?: string;
  isVerified: boolean;
  quiz: IQuizQuestion[];
}

const localizedSchema = new Schema<ILocalizedText>(
  {
    am: { type: String, required: true },
    ao: { type: String, required: true }
  },
  { _id: false }
);

const quizSchema = new Schema<IQuizQuestion>(
  {
    question: { type: localizedSchema, required: true },
    options: {
      type: [localizedSchema],
      required: true
    },
    correctAnswerIndex: { type: Number, required: true }
  },
  { _id: false }
);

const lessonSchema = new Schema<ILesson>(
  {
    topicId: {
      type: Schema.Types.ObjectId,
      ref: "Topic",
      required: true
    },
    order: { type: Number, required: true },
    content: { type: localizedSchema, required: true },
    audioUrl: { type: String },
    writingPrompt: { type: String },
    isVerified: { type: Boolean, default: false },
    quiz: { type: [quizSchema], default: [] }
  },
  { timestamps: true }
);

// Index to enforce correct lesson ordering within a topic
lessonSchema.index({ topicId: 1, order: 1 }, { unique: true });

export const Lesson = model<ILesson>("Lesson", lessonSchema);