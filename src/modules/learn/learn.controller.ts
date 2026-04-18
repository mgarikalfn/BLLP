import { Request, Response } from "express";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";
import { Question } from "../content/question.model";
import { Progress } from "../study/progress.model";
import { StudyStats } from "../study/study.statts.models";


export const getTopicLessons = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;

    const topic = await Topic.findById(topicId);
    if (!topic) {
      return res.status(404).json({
        message: "Topic not found",
      });
    }

    const lessons = await Lesson.find({
      topicId,
      isVerified: true,
    }).sort({ order: 1 });

    return res.json({
      topic: {
        id: topic._id,
        title: topic.title,
      },
      totalLessons: lessons.length,
      lessons,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const completeLesson = async (req: Request, res: Response) => {
  const authReq = req as any;
  const userId = authReq.user.id;

  try {
    const { lessonId } = req.body;

    const lesson = await Lesson.findById(lessonId);
    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found",
      });
    }

    let progress = await Progress.findOne({
      userId,
      contentId: lessonId,
      contentType: "LESSON",
    });

    if (!progress) {
      progress = new Progress({
        userId,
        contentId: lessonId,
        contentType: "LESSON",
        repetition: 0,
        interval: 1,
        easeFactor: 2.5,
        lastReviewed: new Date(),
        nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      await progress.save();
    }

    let stats = await StudyStats.findOne({ userId });

    if (!stats) {
      stats = new StudyStats({ userId });
    }

    const flatXp = 10;

    stats.xp = (stats.xp || 0) + flatXp;

    await stats.save();

    return res.json({
      message: "Lesson completed",
      xpEarned: flatXp,
      totalXP: stats.xp,
      nextReview: progress.nextReview,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

export const getLessonsById = async (req:Request , res:Response) => {
  try{
    const {id} = req.params;
    const [lesson, lessonQuestions] = await Promise.all([
      Lesson.findById(id),
      Question.find({
        lessonId: id,
        intendedFor: { $in: ["LESSON", "BOTH"] },
      }),
    ]);
    if(!lesson) return  res.status(404).json({ message: "Lesson not found" });
    res.status(200).json({
      ...lesson.toObject(),
      quiz: lessonQuestions,
    });
  } catch (error) {
    console.error("Error fetching lesson:", error);
    res.status(500).json({ message: "Server error", error });
  }
}