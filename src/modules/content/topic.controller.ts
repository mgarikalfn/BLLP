import { Request, Response } from "express";
import { Topic } from "./topic.model";
import { generateSlug } from "../../utils/slugify";

export const createTopic = async (req: Request, res: Response) => {
  try {
    const { title, description, level, thumbnailUrl } = req.body;

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
  

const topicPayload = {
  title: title,
  description: description,
  level: level,
  slug: slug, // Use explicit key:value
  thumbnailUrl: thumbnailUrl
};

console.log("FINAL PAYLOAD BEFORE DB:", JSON.stringify(topicPayload, null, 2));

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
    const topics = await Topic.find().sort({ createdAt: -1 });
    res.json(topics);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};