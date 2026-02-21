import { Request, Response } from "express";
import { Lesson } from "./lesson.model";

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { topicId, order, content, audioUrl, writingPrompt, quiz } = req.body;

    // Log the incoming data to verify what Postman is sending
    console.log("Incoming Lesson Data:", JSON.stringify(req.body, null, 2));

    const lesson = await Lesson.create({
      topicId,
      order,
      content,
      audioUrl,
      writingPrompt,
      quiz
    });

    return res.status(201).json(lesson);
  } catch (error: any) {
    // THIS IS THE MOST IMPORTANT LINE FOR DEBUGGING
    console.error("CRITICAL LESSON ERROR:", error);

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate error: This lesson order already exists for this topic.",
        error: error.keyValue 
      });
    }

    return res.status(500).json({ 
      message: "Internal Server Error", 
      details: error.message 
    });
  }
};
export const getLessonsByTopic = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const { verified } = req.query;

    const filter: any = { topicId };

    if (verified === "true") {
      filter.isVerified = true;
    }

    const lessons = await Lesson.find(filter).sort({ order: 1 });

    res.json(lessons);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};