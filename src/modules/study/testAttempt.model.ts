import { Schema, model, Types } from "mongoose";
import { ProficiencyLevel } from "../user/user.model";

export type TestAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "FAILED";

export interface IUserAnswer {
  questionId: Types.ObjectId;
  answerGiven: any;
  isCorrect: boolean;
}

export interface ITestAttempt {
  userId: Types.ObjectId;
  level: ProficiencyLevel;
  status: TestAttemptStatus;
  startTime: Date;
  endTime?: Date;
  score: number;
  passed: boolean;
  questions: Types.ObjectId[];
  userAnswers: IUserAnswer[];
}

const userAnswerSchema = new Schema<IUserAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "Question", required: true },
    answerGiven: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean, default: false },
  },
  { _id: false },
);

const testAttemptSchema = new Schema<ITestAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    level: { type: String, enum: Object.values(ProficiencyLevel), required: true },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED", "FAILED"],
      default: "IN_PROGRESS",
    },
    startTime: { type: Date, default: Date.now },
    endTime: { type: Date },
    score: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    questions: [{ type: Schema.Types.ObjectId, ref: "Question", required: true }],
    userAnswers: { type: [userAnswerSchema], default: [] },
  },
  { timestamps: true },
);

testAttemptSchema.index({ userId: 1, level: 1, status: 1 });

export const TestAttempt = model<ITestAttempt>("TestAttempt", testAttemptSchema);
