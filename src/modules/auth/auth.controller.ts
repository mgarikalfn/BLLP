import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  LearningDirection,
  ProficiencyLevel,
  targetLanguage,
  User,
} from "../user/user.model";
import { Role } from "../user/user.model";
import { ENV } from "../../config/env";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
import { StudyStats } from "../study/study.statts.models";
import { sendVerificationEmail } from "../../utils/mailer";

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      username,
     targetLanguage: reqTargetLanguage,
      proficiencyLevel,
      learningDirection,
      avatarUrl,
      bio,
    } = req.body;

    const resolvedTargetLanguage = reqTargetLanguage as targetLanguage;
    const resolvedProficiency = proficiencyLevel as ProficiencyLevel;
    const resolvedLearningDirection =
      (learningDirection as LearningDirection) ?? LearningDirection.AM_TO_OR;

    // 1️⃣ Validation
    if (!email || !password || !username || !resolvedTargetLanguage || !resolvedProficiency) {
      return res.status(400).json({ message: "Missing fields" });
    }

    if (!Object.values(targetLanguage).includes(resolvedTargetLanguage)) {
      return res.status(400).json({ message: "Invalid target language" });
    }

    if (!Object.values(ProficiencyLevel).includes(resolvedProficiency)) {
      return res.status(400).json({ message: "Invalid proficiency level" });
    }

    if (!Object.values(LearningDirection).includes(resolvedLearningDirection)) {
      return res.status(400).json({
        message: "Invalid learning direction. Use AM_TO_OR or OR_TO_AM",
      });
    }

    if (avatarUrl !== undefined && typeof avatarUrl !== "string") {
      return res.status(400).json({ message: "avatarUrl must be a string" });
    }

    if (bio !== undefined && typeof bio !== "string") {
      return res.status(400).json({ message: "bio must be a string" });
    }

    if (typeof bio === "string" && bio.length > 160) {
      return res.status(400).json({ message: "bio must be 160 characters or fewer" });
    }

    // 2️⃣ Double Collision Check (Email & Username)
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ message: "Email already exists" });

    const existingUsername = await User.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    // 3️⃣ Security
    const hashed = await bcrypt.hash(password, 10);

    // 4️⃣ Creation
    const user = await User.create({
      email,
      username, // 👈 Identity saved
      passwordHash: hashed,
      targetLanguage: resolvedTargetLanguage,
      ProficiencyLevel: resolvedProficiency || ProficiencyLevel.BEGINNER,
      learningDirection: resolvedLearningDirection,
      avatarUrl,
      bio,
      role: Role.LEARNER,
    });

    await StudyStats.findOneAndUpdate(
      { userId: user._id },
      { $setOnInsert: { userId: user._id } },
      { upsert: true, new: false },
    );

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationExpires = verificationExpires;
    await user.save();

    await sendVerificationEmail({
      to: user.email,
      username: user.username,
      code: verificationCode,
    });

    res.status(201).json({
      message: "Verification email sent",
      id: user._id,
      username: user.username,
      targetLanguage: user.targetLanguage,
      learningDirection: user.learningDirection,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      isEmailVerified: user.isEmailVerified,
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.passwordHash) {
      return res.status(400).json({ message: "Use Google login for this account" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    if (user.userStatus === "BANNED") {
      return res.status(403).json({ message: "User banned" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role,
      tokenType: "access",
    });

    const refreshToken = generateRefreshToken({
      id: user._id.toString(),
      tokenType: "refresh",
    });

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      accessToken,
      id: user._id.toString(),
      username: user.username,
      role: user.role,
      learningDirection: user.learningDirection,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error instanceof Error ? error.message : String(error) });
  }
};

export const refreshAccessToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: "Missing refresh token" });
    }

    let decoded: { id: string; tokenType?: string };

    try {
      decoded = jwt.verify(refreshToken, ENV.JWT_SECRET) as {
        id: string;
        tokenType?: string;
      };
    } catch {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    if (decoded.tokenType && decoded.tokenType !== "refresh") {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user || user.userStatus === "BANNED") {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Email not verified" });
    }

    if (!user.refreshToken || user.refreshToken !== refreshToken) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    const accessToken = generateAccessToken({
      id: user._id.toString(),
      role: user.role,
      tokenType: "access",
    });

    return res.json({ accessToken });
  } catch (error) {
    console.error("Refresh token error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
    const code =
      (typeof req.body?.code === "string" && req.body.code.trim()) ||
      (typeof req.body?.token === "string" && req.body.token.trim()) ||
      "";

    if (!email || !code) {
      return res.status(400).json({ message: "email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.json({ message: "Email already verified" });
    }

    if (!user.verificationCode || !user.verificationExpires) {
      return res.status(400).json({ message: "Verification code expired or missing" });
    }

    if (user.verificationExpires.getTime() < Date.now()) {
      return res.status(400).json({ message: "Verification code expired" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    user.isEmailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    return res.json({ message: "Email verified" });
  } catch (error) {
    console.error("Verify email error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
