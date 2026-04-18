import { Schema, model, Document } from "mongoose";

export enum Role {
  ADMIN = "ADMIN",
  EXPERT = "EXPERT",
  LEARNER = "LEARNER",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BANNED = "BANNED",
}

export enum ProficiencyLevel {
  BEGINNER = "BEGINNER",
  INTERMEDIATE = "INTERMEDIATE",
  ADVANCED = "ADVANCED",
}

export enum targetLanguage {
  AMHARIC = "AMHARIC",
  OROMO = "OROMO",
}

export enum LearningDirection {
  AM_TO_OR = "AM_TO_OR",
  OR_TO_AM = "OR_TO_AM",
}

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  role: Role;
  userStatus: UserStatus;
  ProficiencyLevel: ProficiencyLevel;
  targetLanguage: targetLanguage;
  learningDirection: LearningDirection;
  avatarUrl?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, trim: true, required: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.LEARNER,
    },
    userStatus: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE,
    },
    ProficiencyLevel: {
      type: String,
      enum: Object.values(ProficiencyLevel),
      default: ProficiencyLevel.BEGINNER,
    },
    targetLanguage: {
      type: String,
      enum: Object.values(targetLanguage),
      default: targetLanguage.AMHARIC,
    },
    learningDirection: {
      type: String,
      enum: Object.values(LearningDirection),
      default: LearningDirection.AM_TO_OR,
    },
    avatarUrl: {
      type: String,
      required: false,
    },
  },
  { timestamps: true },
);

export const User = model<IUser>("User", userSchema);
