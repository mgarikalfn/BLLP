import { Lesson } from "../content/lesson.model";
import { Progress } from "../study/progress.model";


export const getRecommendedLesson = async (userId: string) => {
  // 1️⃣ Get completed lessons for user
  const completed = await Progress.find({
    userId,
    contentType: "LESSON",
    repetition: { $gt: 0 }
  }).select("contentId").lean();

  if (completed.length === 0) {
    // First time learner → first lesson
    const firstLesson = await Lesson.findOne().sort({ order: 1 });
    return firstLesson;
  }

  const completedLessonIds = completed.map((p: any) => p.contentId);
  const completedLessons = await Lesson.find({ _id: { $in: completedLessonIds } })
    .select("order")
    .lean();

  if (completedLessons.length === 0) {
    const firstLesson = await Lesson.findOne().sort({ order: 1 });
    return firstLesson;
  }

  // 2️⃣ Find highest order completed
  const highestOrder = Math.max(
    ...completedLessons.map((l: any) => l.order)
  );

  // 3️⃣ Suggest next lesson in sequence
  const nextLesson = await Lesson.findOne({
    order: highestOrder + 1
  });

  if (nextLesson) return nextLesson;

  // 4️⃣ If no next lesson → curriculum finished
  return null;
};