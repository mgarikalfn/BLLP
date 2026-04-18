import { Request, Response } from "express";
import mongoose from "mongoose";
import { Dialogue, DifficultyLevel } from "./dialogue.model";
import { Progress } from "../study/progress.model";
import { StudyStats } from "../study/study.statts.models";

const isValidDifficultyLevel = (value: unknown): value is DifficultyLevel => {
  return (
    typeof value === "string" &&
    Object.values(DifficultyLevel).includes(value as DifficultyLevel)
  );
};

export const createDialogue = async (req: Request, res: Response) => {
  try {
    const { topicId, scenario, characters, lines, level, isVerified } = req.body;

    if (!topicId || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Valid topicId is required" });
    }

    if (!scenario?.am || !scenario?.ao) {
      return res.status(400).json({ message: "Scenario is required in both languages" });
    }

    if (!Array.isArray(characters) || characters.length === 0) {
      return res.status(400).json({ message: "At least one character is required" });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ message: "At least one dialogue line is required" });
    }

    if (level && !isValidDifficultyLevel(level)) {
      return res.status(400).json({ message: "Invalid dialogue level" });
    }

    const dialogue = await Dialogue.create({
      topicId,
      scenario,
      characters,
      lines,
      level,
      isVerified,
    });

    return res.status(201).json(dialogue);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate dialogue data", error: error.keyValue });
    }

    console.error("Create dialogue error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getAllDialogues = async (req: Request, res: Response) => {
  try {
    const { topicId, level, verified } = req.query;
    const filter: Record<string, unknown> = {};

    if (typeof topicId === "string") {
      if (!mongoose.Types.ObjectId.isValid(topicId)) {
        return res.status(400).json({ message: "Invalid topicId" });
      }
      filter.topicId = topicId;
    }

    if (typeof level === "string") {
      if (!isValidDifficultyLevel(level)) {
        return res.status(400).json({ message: "Invalid dialogue level" });
      }
      filter.level = level;
    }

    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    const dialogues = await Dialogue.find(filter).sort({ createdAt: -1 });
    return res.json(dialogues);
  } catch (error: any) {
    console.error("Get dialogues error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getDialogueById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid dialogue id" });
    }

    const dialogue = await Dialogue.findById(id);
    if (!dialogue) {
      return res.status(404).json({ message: "Dialogue not found" });
    }

    return res.json(dialogue);
  } catch (error: any) {
    console.error("Get dialogue by id error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getDialoguesByTopic = async (req: Request, res: Response) => {
  try {
    const topicId = String(req.params.topicId);
    if (!mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    const dialogues = await Dialogue.find({ topicId }).sort({ createdAt: -1 });
    return res.json(dialogues);
  } catch (error: any) {
    console.error("Get dialogues by topic error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const completeDialogue = async (req: Request, res: Response) => {
  const authReq = req as any;
  const userId = authReq.user?.id;

  try {
    const dialogueId = String(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!mongoose.Types.ObjectId.isValid(dialogueId)) {
      return res.status(400).json({ message: "Invalid dialogue id" });
    }

    const dialogue = await Dialogue.findById(dialogueId);
    if (!dialogue) {
      return res.status(404).json({ message: "Dialogue not found" });
    }

    const now = new Date();
    const progress = await Progress.findOneAndUpdate(
      {
        userId,
        contentId: dialogueId,
        contentType: "DIALOGUE",
      },
      {
        $set: {
          lastReviewed: now,
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
          repetition: 1,
          interval: 1,
          easeFactor: 2.5,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    let stats = await StudyStats.findOne({ userId });
    if (!stats) {
      stats = new StudyStats({ userId });
    }

    const flatXp = 10;
    stats.xp = (stats.xp || 0) + flatXp;
    await stats.save();

    return res.status(200).json({
      message: "Dialogue completed",
      xpEarned: flatXp,
      totalXP: stats.xp,
      nextReview: progress?.nextReview,
    });
  } catch (error: any) {
    console.error("Complete dialogue error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const updateDialogue = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid dialogue id" });
    }

    const dialogue = await Dialogue.findById(id);
    if (!dialogue) {
      return res.status(404).json({ message: "Dialogue not found" });
    }

    const updatedData = req.body as Record<string, unknown>;
    delete updatedData._id;
    delete updatedData.__v;
    delete updatedData.createdAt;
    delete updatedData.updatedAt;

    if (updatedData.level && !isValidDifficultyLevel(updatedData.level)) {
      return res.status(400).json({ message: "Invalid dialogue level" });
    }

    if (typeof updatedData.topicId === "string" && !mongoose.Types.ObjectId.isValid(updatedData.topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    Object.assign(dialogue, updatedData);
    await dialogue.save();

    return res.json(dialogue);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate dialogue data", error: error.keyValue });
    }

    console.error("Update dialogue error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const deleteDialogue = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid dialogue id" });
    }

    const dialogue = await Dialogue.findById(id);
    if (!dialogue) {
      return res.status(404).json({ message: "Dialogue not found" });
    }

    await dialogue.deleteOne();
    return res.json({ message: "Dialogue deleted" });
  } catch (error: any) {
    console.error("Delete dialogue error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const toggleDialogueVerification = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid dialogue id" });
    }

    const dialogue = await Dialogue.findById(id);
    if (!dialogue) {
      return res.status(404).json({ message: "Dialogue not found" });
    }

    dialogue.isVerified = !dialogue.isVerified;
    await dialogue.save();

    return res.json({
      message: "Verification status updated",
      isVerified: dialogue.isVerified,
      dialogue,
    });
  } catch (error: any) {
    console.error("Toggle dialogue verification error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};