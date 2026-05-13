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
  passwordHash?: string;
  googleId?: string;
  isEmailVerified: boolean;
  refreshToken?: string;
  verificationCode?: string;
  verificationExpires?: Date;
  resetPasswordCode?: string;
  resetPasswordExpires?: Date;
  role: Role;
  userStatus: UserStatus;
  ProficiencyLevel: ProficiencyLevel;
  targetLanguage: targetLanguage;
  learningDirection: LearningDirection;
  avatarUrl?: string;
  bio?:string;
  moderationFlags?: {
    isFlagged: boolean;
    warningCount: number;
    lastModeratedAt?: Date;
  };
  isFlagged: boolean;
  flaggedBy?: string; // ObjectId of the expert who flagged the user
  flaggedAt?: Date;
  flagReason?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    username: { type: String, unique: true, trim: true, required: true },
    passwordHash: { type: String, required: false },
    googleId: { type: String, required: false },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, required: false },
    verificationCode: { type: String, required: false },
    verificationExpires: { type: Date, required: false },
    resetPasswordCode: { type: String, required: false },
    resetPasswordExpires: { type: Date, required: false },
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
    bio:{
      type:String,
      required:false,
    },
    moderationFlags: {
      isFlagged: { type: Boolean, default: false },
      warningCount: { type: Number, default: 0 },
      lastModeratedAt: { type: Date },
    },
    isFlagged: { type: Boolean, default: false },
    flaggedBy: { type: Schema.Types.ObjectId, ref: "User", required: false },
    flaggedAt: { type: Date, required: false },
    flagReason: { type: String, required: false },
  },
  { timestamps: true },
);

// Create index on isFlagged for admin dashboard queries
userSchema.index({ isFlagged: 1 });

export const User = model<IUser>("User", userSchema);
