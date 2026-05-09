import { Request, Response } from "express";
import { Types } from "mongoose";
import { Topic } from "./topic.model";
import { generateSlug } from "../../utils/slugify";
import { Lesson } from "./lesson.model";
import { Question } from "./question.model";
import { Progress } from "../study/progress.model";
import { Dialogue } from "../dialogue/dialogue.model";
import { WritingExercise } from "../writtingExercise/writingExercise.model";
import { SpeakingExercise } from "../speaking/speakingExercise.model";
import { YoutubeVideo } from "../video/youtubeVideo.model";

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { title, description, level, thumbnailUrl, unitNumber, section, tips } = req.body;

    // 1. Validate Input
    if (!title?.am || !title?.ao || !description?.am || !description?.ao || !level) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // 2. Generate Slug (Prefer Afaan Oromo as it's Latin-based and cleaner for URLs)
    const slugBase = title.ao || title.am;
    const slug = generateSlug(slugBase);

    // DEBUG: If you still get the error, check your terminal for this log!
    console.log("DEBUG: Generated Slug ->", `"${slug}"`);

    // 3. Final Validation for Slug
    if (!slug || slug.length < 1) {
      // Fallback: If slug generation fails, append a timestamp
      return res.status(400).json({ message: "Invalid title for URL generation" });
    }

    // 4. Create Topic
  

const normalizedUnitNumber = Number.isFinite(Number(unitNumber)) ? Number(unitNumber) : 0;
const normalizedSection = typeof section === "string" && section.trim().length > 0 ? section : "A1";

const topicPayload = {
  title: title,
  description: description,
  level: level,
  slug: slug, // Use explicit key:value
  thumbnailUrl: thumbnailUrl,
  unitNumber: normalizedUnitNumber,
  section: normalizedSection,
  tips: tips,
  isPublished: false
};

//console.log("FINAL PAYLOAD BEFORE DB:", JSON.stringify(topicPayload, null, 2));

const topic = await Topic.create(topicPayload);

    return res.status(201).json(topic);
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Topic with this title already exists" });
    }
    console.error("Mongoose Error:", error.message);
    res.status(500).json({ message: error.message || "Server error" });
  }
};

export const getAllTopics = async (_req: Request, res: Response) => {
  try {
    const topics = await Topic.find().sort({ section: 1, unitNumber: 1 });
    res.json(topics);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, level, thumbnailUrl, unitNumber, section, tips, isPublished } = req.body;

    const topic = await Topic.findById(id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    if (title?.am) {
      topic.title = title;
      topic.slug = generateSlug(title.am);
    }

    if (description) topic.description = description;
    if (level) topic.level = level;
    if (thumbnailUrl !== undefined) topic.thumbnailUrl = thumbnailUrl;
    if (unitNumber !== undefined) {
      const normalizedUnitNumber = Number(unitNumber);
      if (!Number.isNaN(normalizedUnitNumber)) {
        topic.unitNumber = normalizedUnitNumber;
      }
    }
    if (section) topic.section = section;
    if (tips !== undefined) topic.tips = tips;
    if (typeof isPublished === "boolean") topic.isPublished = isPublished;

    await topic.save();

    res.json(topic);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const publishTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) return res.status(404).json({ message: "Topic not found" });

    topic.isPublished = true;
    await topic.save();

    return res.json(topic);
  } catch {
    return res.status(500).json({ message: "Server error" });
  }
};


import { WritingAttempt } from "../writtingExercise/WritingAttempt.model";

export const deleteTopic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`[DELETE TOPIC] Attempting to delete topic: ${id}`);

    const topic = await Topic.findById(id);
    if (!topic) {
      console.warn(`[DELETE TOPIC] Topic ${id} not found`);
      return res.status(404).json({ message: "Topic not found" });
    }

    // 1. Get all lesson IDs for this topic to clean up their progress/attempts
    const lessons = await Lesson.find({ topicId: id }).select("_id").lean();
    const lessonIds = lessons.map((l) => l._id);

    // 2. Comprehensive cleanup of all associated content
    console.log(`[DELETE TOPIC] Cleaning up associated content for topic: ${id}`);
    
    const results = await Promise.allSettled([
      Lesson.deleteMany({ topicId: id }),
      Question.deleteMany({ topicId: id }),
      Dialogue.deleteMany({ topicId: id }),
      WritingExercise.deleteMany({ topicId: id }),
      SpeakingExercise.deleteMany({ topicId: id }),
      YoutubeVideo.deleteMany({ topicId: id }),
      WritingAttempt.deleteMany({ topicId: id }),
      Progress.deleteMany({ 
        $or: [
          { contentId: id, contentType: "TOPIC_TEST" },
          { contentId: { $in: lessonIds }, contentType: "LESSON" }
        ]
      }),
    ]);

    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(`[DELETE TOPIC] Step ${index} failed:`, result.reason);
      }
    });

    await topic.deleteOne();
    console.log(`[DELETE TOPIC] Successfully deleted topic: ${id}`);

    return res.json({ message: "Topic and all related content deleted successfully" });
  } catch (error: any) {
    console.error("[DELETE TOPIC] Fatal error:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getTopicTest = async (req: Request, res: Response) => {
  try {
    const topicId = Array.isArray(req.params.topicId)
      ? req.params.topicId[0]
      : req.params.topicId;
    const requestedSize = Number(req.query.size);
    const sampleSize = Number.isInteger(requestedSize) && requestedSize > 0 ? requestedSize : 10;

    if (!topicId || !Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    const testQuestions = await Question.aggregate([
      {
        $match: {
          topicId: new Types.ObjectId(topicId),
          intendedFor: { $in: ["TEST", "BOTH"] },
        },
      },
      { $sample: { size: sampleSize } },
    ]);

    return res.status(200).json({
      topicId,
      count: testQuestions.length,
      questions: testQuestions,
    });
  } catch (error) {
    console.error("Error generating topic test:", error);
    return res.status(500).json({ message: "Error generating topic test" });
  }
};

export const submitTopicTest = async (req: Request, res: Response) => {
  try {
    const authReq = req as Request & { user?: { id: string } };
    const userId = authReq.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const topicId = String(req.params.topicId);
    const { passed, score } = req.body;

    if (!req.params.topicId || !Types.ObjectId.isValid(topicId)) {
      return res.status(400).json({ message: "Invalid topic id" });
    }

    if (passed) {
      // Create or update progress for TOPIC_TEST
      await Progress.findOneAndUpdate(
        {
          userId,
          contentId: topicId,
          contentType: "TOPIC_TEST"
        },
        {
          $set: {
            lastReviewed: new Date(),
          },
          $max: { bestScore: score || 0 }
        },
        { upsert: true, new: true }
      );
    }

    return res.status(200).json({ success: true, message: "Test result submitted successfully" });
  } catch (error) {
    console.error("Error submitting topic test:", error);
    return res.status(500).json({ message: "Error submitting topic test result" });
  }
};