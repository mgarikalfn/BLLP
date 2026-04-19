import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  LearningDirection,
  ProficiencyLevel,
  targetLanguage,
  User,
} from "../user/user.model";
import { Role } from "../user/user.model";
import { generateToken } from "../../utils/jwt";
import { StudyStats } from "../study/study.statts.models";

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

    res.status(201).json({
      id: user._id,
      username: user.username,
      targetLanguage: user.targetLanguage,
      learningDirection: user.learningDirection,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
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

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    if (user.userStatus === "BANNED")
      return res.status(403).json({ message: "User banned" });

    const token = generateToken({
      id: user._id.toString(),
      role: user.role,
    });

    res.json({
      token,
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
