import { Request, Response } from "express";
import mongoose from "mongoose";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";
import { Dialogue } from "../dialogue/dialogue.model";
import { WritingExercise } from "../writtingExercise/writingExercise.model";
import { Progress } from "../study/progress.model";



type AuthRequest = Request & {
  user?: { id: string };
};

export const getTopicWorkspace = async (
  req: AuthRequest,
  res: Response
) => {
  try {

    const {id: topicId } = req.params;
    const userId = req.user?.id;

     if (typeof topicId !== "string" || !mongoose.Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid topic id"
      });
    } 

    const topicObjectId = new mongoose.Types.ObjectId(topicId);

    const [
      topic,
      lessons,
      dialogues,
      writing
    ] = await Promise.all([

      Topic.findById(topicObjectId).lean(),

      Lesson.find({ topicId: topicObjectId })
        .select("_id order title")
        .sort({ order: 1 })
        .lean(),

      Dialogue.find({ topicId: topicObjectId }).lean(),

      WritingExercise.find({ topicId: topicObjectId }).lean()

    ]);

    if (!topic) {
      return res.status(404).json({
        success: false,
        message: "Topic not found"
      });
    }

    const lessonIds = lessons.map(l => l._id);

    const progress = await Progress.find({
      userId,
      lessonId: { $in: lessonIds }
    }).lean();

    const completedLessonIds = new Set(
      progress.map(p => p.lessonId.toString())
    );

    const lessonsWithProgress = lessons.map(l => ({
      ...l,
      completed: completedLessonIds.has(l._id.toString())
    }));

    const completedLessons = lessonsWithProgress.filter(
      l => l.completed
    ).length;

    return res.json({
      success: true,
      data: {

        topic: {
          _id: topic._id,
          title: topic.title
        },

        lessons: lessonsWithProgress,

        dialogues,

        writing,

        progress: {
          completedLessons,
          totalLessons: lessons.length
        }

      }
    });

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to load topic workspace"
    });

  }
};