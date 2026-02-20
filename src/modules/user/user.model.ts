import { Schema, model, Document } from "mongoose";

export enum Role {
  ADMIN = "ADMIN",
  EXPERT = "EXPERT",
  LEARNER = "LEARNER"
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  BANNED = "BANNED"
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: Role;
  userStatus: UserStatus;
  nativeLanguage: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: Object.values(Role),
      default: Role.LEARNER
    },
    userStatus: {
      type: String,
      enum: Object.values(UserStatus),
      default: UserStatus.ACTIVE
    },
    nativeLanguage: { type: String, required: true }
  },
  { timestamps: true }
);

export const User = model<IUser>("User", userSchema);
