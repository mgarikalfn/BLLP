import { Lesson } from "../content/lesson.model";
import { Progress } from "../study/progress.model";


export const getRecommendedLesson = async (userId: string) => {
  // 1️⃣ Get completed lessons for user
  const completed = await Progress.find({
    userId,
    repetition: { $gt: 0 }
  }).populate("lessonId");

  if (completed.length === 0) {
    // First time learner → first lesson
    const firstLesson = await Lesson.findOne().sort({ order: 1 });
    return firstLesson;
  }

  // 2️⃣ Find highest order completed
  const highestOrder = Math.max(
    ...completed.map((p: any) => p.lessonId.order)
  );

  // 3️⃣ Suggest next lesson in sequence
  const nextLesson = await Lesson.findOne({
    order: highestOrder + 1
  });

  if (nextLesson) return nextLesson;

  // 4️⃣ If no next lesson → curriculum finished
  return null;
};