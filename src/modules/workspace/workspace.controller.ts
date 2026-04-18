import { Request, Response } from "express";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";
import { Dialogue } from "../dialogue/dialogue.model";
import { WritingExercise } from "../writtingExercise/writingExercise.model";
import { SpeakingExercise } from "../speaking/speakingExercise.model";
import { Progress } from "../study/progress.model";

type AuthRequest = Request & {
  user?: { id: string };
};

export const getTopicsFeed = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // 1. Pagination & Filtering
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const level = req.query.level as string;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (level) filter.level = level;

    // 2. Fetch Topics
    const topics = await Topic.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const topicIds = topics.map(t => t._id);

    // 3. Fetch All Content Types in Parallel
    const [allLessons, allDialogues, allWriting, allSpeaking] = await Promise.all([
      Lesson.find({ topicId: { $in: topicIds } }).sort({ order: 1 }).lean(),
      Dialogue.find({ topicId: { $in: topicIds } }).lean(),
      WritingExercise.find({ topicId: { $in: topicIds } }).lean(),
      SpeakingExercise.find({ topicId: { $in: topicIds } }).lean()
    ]);

    // 4. Fetch Polymorphic User Progress
    // We collect every ID we just fetched to optimize the DB query
    const allContentIds = [
      ...allLessons.map(l => l._id),
      ...allDialogues.map(d => d._id),
      ...allWriting.map(w => w._id),
      ...allSpeaking.map(s => s._id)
    ];

    const userProgress = await Progress.find({
      userId,
      contentId: { $in: allContentIds },
      contentType: { $in: ["LESSON", "DIALOGUE", "WRITING", "SPEAKING"] },
    }).select("contentId contentType").lean();

    // Create a composite-key Set for O(1) lookup speed and type-safe completion checks.
    const completedContentKeys = new Set(
      userProgress.map(p => `${p.contentType}:${p.contentId.toString()}`)
    );

    // 5. Group Content by Topic
    const groupById = (items: any[]) => {
      const map = new Map<string, any[]>();
      items.forEach(item => {
        const tid = item.topicId.toString();
        if (!map.has(tid)) map.set(tid, []);
        map.get(tid)!.push(item);
      });
      return map;
    };

    const lessonsByTopic = groupById(allLessons);
    const dialoguesByTopic = groupById(allDialogues);
    const writingByTopic = groupById(allWriting);
    const speakingByTopic = groupById(allSpeaking);

    // 6. Build the Journey
    let globalActiveFound = false;

    const topicsWithPath = topics.map(topic => {
      const tId = topic._id.toString();
      
      // Define the "Internal Order" for this specific topic
      // You can adjust this order based on how you want to teach
      const rawSequence = [
        ...(lessonsByTopic.get(tId) || []).map(l => ({ ...l, type: 'LESSON' })),
        ...(dialoguesByTopic.get(tId) || []).map(d => ({ ...d, type: 'DIALOGUE', title: d.scenario })),
        ...(writingByTopic.get(tId) || []).map(w => ({ ...w, type: 'WRITING', title: w.prompt?.am || w.type })),
        ...(speakingByTopic.get(tId) || []).map(s => ({ ...s, type: 'SPEAKING', title: s.prompt?.am || "Speech" }))
      ];

      // Apply Status Logic to the combined sequence
      const processedSequence = rawSequence.map(item => {
        const completionKey = `${item.type}:${item._id.toString()}`;
        const isCompleted = completedContentKeys.has(completionKey);
        let status = "locked";

        if (isCompleted) {
          status = "completed";
        } else if (!globalActiveFound) {
          status = "active";
          globalActiveFound = true; 
        }

        return {
          _id: item._id,
          title: item.title,
          type: item.type,
          status
        };
      });

      // Handle the Topic Test (The Final Gatekeeper)
      let testStatus = "locked";
      const allTasksDone = processedSequence.every(n => n.status === "completed");
      
      if (allTasksDone && !globalActiveFound) {
        testStatus = "active";
        globalActiveFound = true;
      } else if (allTasksDone && globalActiveFound) {
        // This means the user finished this topic, but is stuck on a later one
        testStatus = "completed"; 
      }

      const total = processedSequence.length;
      const completedCount = processedSequence.filter(n => n.status === "completed").length;

      return {
        _id: topic._id,
        title: topic.title,
        level: topic.level,
        pathNodes: processedSequence, // Frontend can now map this single array
        topicTest: {
          title: "Unit Review",
          status: testStatus
        },
        progress: {
          completedCount,
          totalCount: total,
          percentage: total > 0 ? Math.round((completedCount / total) * 100) : 0
        }
      };
    });

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