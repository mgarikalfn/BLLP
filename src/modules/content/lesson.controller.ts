import { Request, Response } from "express";
import { Lesson } from "./lesson.model";

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { topicId, order, title, vocabulary, quiz, isVerified } = req.body;

    // Log the incoming data to verify what Postman is sending
    // console.log("Incoming Lesson Data:", JSON.stringify(req.body, null, 2));

    const lesson = await Lesson.create({
      topicId,
      order,
      title,
      vocabulary,
      quiz,
      isVerified // Optional: will default to false if not provided, based on your schema
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

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    Object.assign(lesson, req.body);

    await lesson.save();

    res.json(lesson);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate lesson order" });
    }
    res.status(500).json({ message: "Server error" });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    await lesson.deleteOne();

    res.json({ message: "Lesson deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.isVerified = !lesson.isVerified;
    await lesson.save();

    res.json({ message: "Verification status updated", isVerified: lesson.isVerified });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};