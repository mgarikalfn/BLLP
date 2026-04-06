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

export const getTopicsFeed = async (
  req: AuthRequest,
  res: Response
) => {
 try {
    const userId = req.user?.id;

    // 1. Pagination Params
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5; // Smaller limit is better for "Units"
    const level = req.query.level as string;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (level) filter.level = level;

    // 2. Fetch Topics for this "chunk" of the infinite scroll
    const topics = await Topic.find(filter)
      .sort({ order: 1, createdAt: 1 }) // Ensure alphabetical or manual order
      .skip(skip)
      .limit(limit)
      .lean();

    const topicIds = topics.map(t => t._id);

    // 3. Fetch ALL lessons belonging to these topics
    const allLessons = await Lesson.find({
      topicId: { $in: topicIds }
    })
      .select("_id topicId order title")
      .sort({ order: 1 })
      .lean();

    // 3.1 Fetch dialogues for these topics (id + title-like localized text)
    const allDialogues = await Dialogue.find({
      topicId: { $in: topicIds }
    })
      .select("_id topicId scenario")
      .sort({ createdAt: 1 })
      .lean();

    // 3.2 Fetch writing exercises for these topics
    const allWritingExercises = await WritingExercise.find({
      topicId: { $in: topicIds }
    })
      .select("_id topicId type prompt")
      .sort({ createdAt: 1 })
      .lean();

    // 4. Fetch User Progress for these specific lessons
    const lessonIds = allLessons.map(l => l._id);
    const userProgress = await Progress.find({
      userId,
      lessonId: { $in: lessonIds }
    })
      .select("lessonId")
      .lean();

    const completedLessonIds = new Set(
      userProgress.map(p => p.lessonId.toString())
    );

    // 5. Group Lessons by Topic ID for easy mapping
    const lessonsByTopic = new Map<string, any[]>();
    allLessons.forEach(lesson => {
      const tid = lesson.topicId.toString();
      if (!lessonsByTopic.has(tid)) lessonsByTopic.set(tid, []);
      lessonsByTopic.get(tid)!.push(lesson);
    });

    // 5.1 Group Dialogues by Topic ID
    const dialoguesByTopic = new Map<string, any[]>();
    allDialogues.forEach((dialogue: any) => {
      const tid = dialogue.topicId.toString();
      if (!dialoguesByTopic.has(tid)) dialoguesByTopic.set(tid, []);
      dialoguesByTopic.get(tid)!.push(dialogue);
    });

    // 5.2 Group Writing Exercises by Topic ID
    const writingExercisesByTopic = new Map<string, any[]>();
    allWritingExercises.forEach((exercise: any) => {
      const tid = exercise.topicId.toString();
      if (!writingExercisesByTopic.has(tid)) writingExercisesByTopic.set(tid, []);
      writingExercisesByTopic.get(tid)!.push(exercise);
    });

    // 6. Build the Final "Journey" Response
    // We use a global "foundActive" flag to ensure only ONE lesson 
    // across the entire feed is marked as 'active' (the current one to play).
    let globalActiveFound = false;

    const topicsWithPath = topics.map(topic => {
      const topicLessons = lessonsByTopic.get(topic._id.toString()) || [];
      const topicDialogues = dialoguesByTopic.get(topic._id.toString()) || [];
      const topicWritingExercises = writingExercisesByTopic.get(topic._id.toString()) || [];
      
      const processedLessons = topicLessons.map(l => {
        const isCompleted = completedLessonIds.has(l._id.toString());
        let status = "locked";

        if (isCompleted) {
          status = "completed";
        } else if (!globalActiveFound) {
          status = "active";
          globalActiveFound = true; // All subsequent lessons in all topics stay 'locked'
        }

        return {
          _id: l._id,
          title: l.title,
          status
        };
      });

      const processedDialogues = topicDialogues.map((d: any) => ({
        _id: d._id,
        title: d.scenario,
      }));

      const processedWritingExercises = topicWritingExercises.map((e: any) => ({
        _id: e._id,
        title: e.prompt ? (e.prompt.am || e.prompt.ao || e.type) : e.type, 
      }));

      const total = topicLessons.length;
      const completedCount = processedLessons.filter(l => l.status === "completed").length;

      return {
        _id: topic._id,
        title: topic.title,
        level: topic.level,
        lessons: processedLessons,
        dialogues: processedDialogues,
        writingExercises: processedWritingExercises,
        progress: {
          completedLessons: completedCount,
          totalLessons: total,
          percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0
        },
        isCompleted: total > 0 && completedCount === total
      };
    });

    // 7. Return with Pagination Metadata
    return res.json({
      success: true,
      data: {
        topics: topicsWithPath,
        pagination: {
          currentPage: page,
          hasMore: topics.length === limit,
          nextPage: topics.length === limit ? page + 1 : null
        }
      }
    });

  } catch (error) {
    console.error("Feed Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate learning feed"
    });
  }
};