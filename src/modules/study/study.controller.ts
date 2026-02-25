import { Request, Response } from "express";
import { Progress } from "./progress.model";
import { calculateSM2 } from "./sm2.utils";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export const reviewLesson = async (
  req: Request,
  res: Response
) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.id;
    const { lessonId, quality } = req.body;

    if (quality < 0 || quality > 5) {
      return res.status(400).json({
        message: "Quality must be between 0 and 5"
      });
    }

    let progress = await Progress.findOne({
      userId,
      lessonId
    });

    if (!progress) {
      progress = new Progress({
        userId,
        lessonId
      });
    }

    const result = calculateSM2(
      quality,
      progress.repetition,
      progress.interval,
      progress.easeFactor
    );

    progress.repetition = result.repetition;
    progress.interval = result.interval;
    progress.easeFactor = result.easeFactor;
    progress.lastReviewed = new Date();
    progress.nextReview = new Date(
      Date.now() + result.interval * 24 * 60 * 60 * 1000
    );

    await progress.save();

    res.json({
      message: "Review recorded",
      nextReview: progress.nextReview
    });
  } catch {
    res.status(500).json({
      message: "Server error"
    });
  }
};

export const getDueLessons = async (
  req: Request,
  res: Response
) => {
  try {
   const authReq = req as AuthRequest;
    const userId = authReq.user!.id;

    const dueLessons = await Progress.find({
      userId,
      nextReview: { $lte: new Date() }
    }).populate("lessonId");

    res.json(dueLessons);
  } catch {
    res.status(500).json({
      message: "Server error"
    });
  }
};