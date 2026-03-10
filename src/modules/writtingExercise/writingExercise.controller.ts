import { Request, Response } from "express";
import { WritingExercise } from "./writingExercise.model";
import { WritingAttempt } from "./WritingAttempt.model";
// Import your Progress model/service here to update XP/SM-2 stats

export const submitWritingExercise = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id; // From auth middleware
    const { exerciseId, topicId, submittedText, targetLanguage } = req.body;

    // 1. Fetch the original exercise to get the sample answer
    const exercise = await WritingExercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Exercise not found." });
    }

    // 2. Save the user's attempt
    const newAttempt = await WritingAttempt.create({
      userId,
      exerciseId,
      topicId,
      submittedText,
      targetLanguage,
    });

    // 3. (Optional but recommended) Trigger your Progress/SM-2 logic here
    // await ProgressService.markComplete(userId, topicId, 'WRITING');
    // await UserService.addXP(userId, 10);

    // 4. Return success along with the sample answer for immediate UI feedback
    res.status(200).json({
      success: true,
      message: "Writing exercise submitted successfully.",
      data: {
        attemptId: newAttempt._id,
        sampleAnswer: exercise.sampleAnswer,
        // Later, you can inject AI feedback here:
        // aiFeedback: "Great job! Watch your spelling on..."
      },
    });
  } catch (error) {
    console.error("Submit Writing Error:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};