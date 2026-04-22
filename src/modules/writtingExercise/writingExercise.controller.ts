import { Request, Response } from "express";
import { WritingExercise } from "./writingExercise.model";
import { WritingAttempt } from "./WritingAttempt.model";
import { WritingEvaluationService } from "./writingEvaluation.service";
import { Progress } from "../study/progress.model";
import { updateQuestProgress, updateAchievementProgress } from "../../services/achievement.service";

export const submitWritingExercise = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { exerciseId, topicId, submittedText, targetLanguage } = req.body;

    const exercise = await WritingExercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found." });
    }

    // 1. Run the Evaluation
    let evaluation;
    if (exercise.type === "TRANSLATION") {
      const sample = exercise.sampleAnswer[targetLanguage as "am" | "ao"];
      evaluation = WritingEvaluationService.evaluateTranslation(submittedText, sample);
    } else {
      evaluation = await WritingEvaluationService.evaluateOpenPrompt(submittedText, targetLanguage);
    }

    // 2. Save the Attempt (Including the evaluation results)
    const newAttempt = await WritingAttempt.create({
      userId,
      exerciseId,
      topicId,
      submittedText,
      targetLanguage,
      isCompleted: evaluation.isCorrect,
      // Pro-tip: Add a 'feedback' field to your WritingAttempt model to save this!
    });

    // Track writing progress in polymorphic progress model.
    await Progress.findOneAndUpdate(
      {
        userId,
        contentId: exerciseId,
        contentType: "WRITING",
      },
      {
        $set: {
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
          bestScore: evaluation.isCorrect ? 100 : 0,
          repetition: evaluation.isCorrect ? 1 : 0,
          interval: 1,
          easeFactor: 2.5,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // 3. Update Streak & Fire quest + achievement progress in background
    setImmediate(async () => {
      try {
        const { updateStreakAndDailyGoal } = require("../../services/streak.service");
        await updateStreakAndDailyGoal(userId);

        await updateQuestProgress(userId, "LESSONS", 1);
        await updateAchievementProgress(userId, "WRITING", 1);
        if (evaluation.isCorrect) {
          await updateQuestProgress(userId, "ACCURACY", 1);
        }
      } catch (err) {
        console.error("[Writing] Background quest update failed", err);
      }
    });

    // 4. Return a Rich Response
    return res.status(200).json({
      success: true,
      data: {
        isCorrect: evaluation.isCorrect,
        status: evaluation.status || "EVALUATED",
        feedback: evaluation.feedback,
        sampleAnswer: exercise.sampleAnswer[targetLanguage as "am" | "ao"],
        attemptId: newAttempt._id,
      },
    });
  } catch (error) {
    console.error("Controller Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const createWritingExercise = async (req: Request, res: Response) => {
  try {
    const { topicId, type, prompt, hints, sampleAnswer, level } = req.body;

    // 1. Basic validation: Ensure required fields exist
    if (!topicId || !prompt?.am || !prompt?.ao || !sampleAnswer?.am || !sampleAnswer?.ao) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: topicId, prompt (am/ao), or sampleAnswer (am/ao).",
      });
    }

    // 2. Create the document
    const newExercise = await WritingExercise.create({
      topicId,
      type,
      prompt,
      hints,
      sampleAnswer,
      level,
      isVerified: true, // Since an admin is adding this, we can auto-verify
    });

    return res.status(201).json({
      success: true,
      message: "Writing exercise created successfully.",
      data: newExercise,
    });
  } catch (error: any) {
    console.error("Create Exercise Error:", error);
    
    // Handle Mongoose CastErrors (e.g., invalid ObjectId)
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid Topic ID format." });
    }

    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getWritingExerciseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const exercise = await WritingExercise.findById(id);

    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found." });
    }

    return res.status(200).json({
      success: true,
      data: exercise,
    });
  } catch (error: any) {
    console.error("Get Exercise Error:", error);
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid Exercise ID format." });
    }
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};