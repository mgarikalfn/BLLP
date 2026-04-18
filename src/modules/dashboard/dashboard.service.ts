import { Lesson } from "../content/lesson.model";
import { Progress } from "../study/progress.model";

const formatRecommendedLesson = (lesson: any) => {
  if (!lesson) return null;

  const topic = lesson.topicId && typeof lesson.topicId === "object"
    ? lesson.topicId
    : null;

  return {
    id: lesson._id,
    title: lesson.title,
    order: lesson.order,
    topic: topic
      ? {
          id: topic._id,
          title: topic.title,
          level: topic.level,
        }
      : {
          id: lesson.topicId,
          title: null,
          level: null,
        },
  };
};


export const getRecommendedLesson = async (userId: string) => {
  // 1️⃣ Get completed lessons for user
  const completed = await Progress.find({
    userId,
    contentType: "LESSON",
    repetition: { $gt: 0 }
  }).select("contentId").lean();

  if (completed.length === 0) {
    // First time learner → first lesson
    const firstLesson = await Lesson.findOne()
      .sort({ order: 1 })
      .populate("topicId", "title level")
      .lean();
    return formatRecommendedLesson(firstLesson);
  }

  const completedLessonIds = completed.map((p: any) => p.contentId);
  const completedLessons = await Lesson.find({ _id: { $in: completedLessonIds } })
    .select("order")
    .lean();

  if (completedLessons.length === 0) {
    const firstLesson = await Lesson.findOne()
      .sort({ order: 1 })
      .populate("topicId", "title level")
      .lean();
    return formatRecommendedLesson(firstLesson);
  }

  // 2️⃣ Find highest order completed
  const highestOrder = Math.max(
    ...completedLessons.map((l: any) => l.order)
  );

  // 3️⃣ Suggest next lesson in sequence
  const nextLesson = await Lesson.findOne({ order: highestOrder + 1 })
    .populate("topicId", "title level")
    .lean();
  
  if (nextLesson) return formatRecommendedLesson(nextLesson);

  // 4️⃣ If no next lesson → curriculum finished
  return null;
};