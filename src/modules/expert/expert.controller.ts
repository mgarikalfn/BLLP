import { Response } from "express";
import { Types } from "mongoose";
import { Lesson } from "../content/lesson.model";
import { Question } from "../content/question.model";
import { Topic } from "../content/topic.model";
import { Dialogue } from "../dialogue/dialogue.model";
import { SpeakingExercise } from "../speaking/speakingExercise.model";
import { WritingExercise } from "../writtingExercise/writingExercise.model";
import { AuthRequest } from "../../middleware/auth.middleware";
import { generateSlug } from "../../utils/slugify";
import { ExpertContentGenerator, ExpertGeneratorError, buildPrompt } from "./expert.generator";

const CONTENT_TYPES = ["LESSON", "DIALOGUE", "WRITING", "SPEAKING", "QUESTION", "TOPIC"] as const;
const STATUS_VALUES = ["DRAFT", "NEEDS_REVIEW", "PUBLISHED"] as const;

type ContentType = (typeof CONTENT_TYPES)[number];
type StatusType = (typeof STATUS_VALUES)[number];

type FetchFilter = Record<string, unknown>;

type TitleBuilder = (item: any) => string;

const asParam = (value: any): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
};

const isValidObjectId = (value?: string): value is string => !!value && Types.ObjectId.isValid(value);

const normalizeType = (value?: string) => (value ? value.toUpperCase() : undefined);

const isValidContentType = (value?: string): value is ContentType =>
  !!value && CONTENT_TYPES.includes(value as ContentType);

const isValidStatus = (value?: string): value is StatusType =>
  !!value && STATUS_VALUES.includes(value as StatusType);

const normalizeTopicFilter = (filter: FetchFilter) => {
  const topicFilter: FetchFilter = { ...filter };

  if (typeof topicFilter.topicId === "string") {
    topicFilter._id = topicFilter.topicId;
    delete topicFilter.topicId;
  }

  if (Object.prototype.hasOwnProperty.call(topicFilter, "status")) {
    const statusValue = String(topicFilter.status || "").toUpperCase();
    delete topicFilter.status;
    if (statusValue === "PUBLISHED") {
      topicFilter.isPublished = true;
    }
    if (statusValue === "DRAFT" || statusValue === "NEEDS_REVIEW") {
      topicFilter.isPublished = false;
    }
  }

  if (Object.prototype.hasOwnProperty.call(topicFilter, "isVerified")) {
    const isVerified = topicFilter.isVerified;
    delete topicFilter.isVerified;
    if (typeof isVerified === "boolean") {
      topicFilter.isPublished = isVerified;
    }
  }

  return topicFilter;
};

const addMeta = (items: any[], contentType: ContentType, titleBuilder: TitleBuilder) =>
  items.map((item) => ({
    ...item,
    _contentType: contentType,
    _title: titleBuilder(item),
  }));

const questionTitleBuilder: TitleBuilder = (item) => {
  let preview = "";
  try {
    preview = JSON.stringify(item?.content ?? {}).slice(0, 30);
  } catch {
    preview = "";
  }

  return preview ? `Question${preview}` : "Question";
};

const titleBuilders: Record<ContentType, TitleBuilder> = {
  LESSON: (item) => item?.title?.am || "Lesson",
  DIALOGUE: (item) => item?.scenario?.am || "Dialogue",
  WRITING: (item) => item?.prompt?.am || "Writing Exercise",
  SPEAKING: (item) => item?.prompt?.am || "Speaking Exercise",
  QUESTION: questionTitleBuilder,
  TOPIC: (item) => item?.title?.am || "Topic",
};

const fetchContent = async (type: ContentType, filter: FetchFilter) => {
  switch (type) {
    case "LESSON": {
      const items = await Lesson.find(filter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    case "DIALOGUE": {
      const items = await Dialogue.find(filter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    case "WRITING": {
      const items = await WritingExercise.find(filter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    case "SPEAKING": {
      const items = await SpeakingExercise.find(filter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    case "QUESTION": {
      const items = await Question.find(filter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    case "TOPIC": {
      const topicFilter = normalizeTopicFilter(filter);
      const items = await Topic.find(topicFilter).lean();
      return addMeta(items, type, titleBuilders[type]);
    }
    default:
      return [];
  }
};

const sortByCreatedAt = (items: any[]) =>
  items.sort((a, b) => {
    const left = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const right = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return right - left;
  });

export const getDashboardStats = async (_req: AuthRequest, res: Response) => {
  try {
    const [
      lessonsTotal,
      lessonsPending,
      lessonsPublished,
      dialoguesTotal,
      dialoguesPending,
      dialoguesPublished,
      writingTotal,
      writingPending,
      writingPublished,
      speakingTotal,
      speakingPending,
      speakingPublished,
      questionsTotal,
      questionsPending,
      questionsPublished,
      topicCount,
    ] = await Promise.all([
      Lesson.countDocuments(),
      Lesson.countDocuments({ isVerified: false }),
      Lesson.countDocuments({ isVerified: true }),
      Dialogue.countDocuments(),
      Dialogue.countDocuments({ isVerified: false }),
      Dialogue.countDocuments({ isVerified: true }),
      WritingExercise.countDocuments(),
      WritingExercise.countDocuments({ isVerified: false }),
      WritingExercise.countDocuments({ isVerified: true }),
      SpeakingExercise.countDocuments(),
      SpeakingExercise.countDocuments({ isVerified: false }),
      SpeakingExercise.countDocuments({ isVerified: true }),
      Question.countDocuments(),
      Question.countDocuments({ isVerified: false }),
      Question.countDocuments({ isVerified: true }),
      Topic.countDocuments(),
    ]);

    return res.json({
      totals: {
        lessons: lessonsTotal,
        dialogues: dialoguesTotal,
        writing: writingTotal,
        speaking: speakingTotal,
        questions: questionsTotal,
      },
      pending: {
        lessons: lessonsPending,
        dialogues: dialoguesPending,
        writing: writingPending,
        speaking: speakingPending,
        questions: questionsPending,
      },
      published: {
        lessons: lessonsPublished,
        dialogues: dialoguesPublished,
        writing: writingPublished,
        speaking: speakingPublished,
        questions: questionsPublished,
      },
      topicCount,
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

export const getPendingContent = async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = normalizeType(asParam(req.query.type));
    const topicId = asParam(req.query.topicId);
    const normalizedType = typeParam && isValidContentType(typeParam) ? typeParam : undefined;

    if (typeParam && !normalizedType) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (topicId && !isValidObjectId(topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    const filter: FetchFilter = { isVerified: false };
    if (topicId) {
      filter.topicId = topicId;
    }

    const typesToFetch: ContentType[] = normalizedType ? [normalizedType] : [...CONTENT_TYPES];

    const results = await Promise.all(
      typesToFetch.map((contentType) => fetchContent(contentType, filter)),
    );

    const merged = sortByCreatedAt(results.flat());

    return res.json({ data: merged, total: merged.length });
  } catch (error: any) {
    console.error("Get pending content error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

export const getAllContent = async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = normalizeType(asParam(req.query.type));
    const topicId = asParam(req.query.topicId);
    const statusParam = normalizeType(asParam(req.query.status));
    const normalizedType = typeParam && isValidContentType(typeParam) ? typeParam : undefined;
    const normalizedStatus = statusParam && isValidStatus(statusParam) ? statusParam : undefined;

    if (typeParam && !normalizedType) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (topicId && !isValidObjectId(topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    if (statusParam && !normalizedStatus) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const filter: FetchFilter = {};
    if (topicId) {
      filter.topicId = topicId;
    }
    if (normalizedStatus) {
      filter.status = normalizedStatus;
    }

    const typesToFetch: ContentType[] = normalizedType ? [normalizedType] : [...CONTENT_TYPES];

    const results = await Promise.all(
      typesToFetch.map((contentType) => fetchContent(contentType, filter)),
    );

    const merged = sortByCreatedAt(results.flat());

    return res.json({ data: merged, total: merged.length });
  } catch (error: any) {
    console.error("Get all content error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

export const verifyContent = async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = normalizeType(String(req.params.type || ""));
    const id = String(req.params.id || "");

    if (!isValidContentType(typeParam)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid content id" });
    }

    const modelMap: Record<ContentType, any> = {
      LESSON: Lesson,
      DIALOGUE: Dialogue,
      WRITING: WritingExercise,
      SPEAKING: SpeakingExercise,
      QUESTION: Question,
      TOPIC: Topic,
    };

    const model = modelMap[typeParam];
    const doc = await model.findById(id);

    if (!doc) {
      return res.status(404).json({ message: "Content not found" });
    }

    if (typeParam === "TOPIC") {
      doc.isPublished = true;
    } else {
      doc.isVerified = true;
      doc.status = "PUBLISHED";
    }
    await doc.save();

    return res.json(doc);
  } catch (error: any) {
    console.error("Verify content error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

export const rejectContent = async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = normalizeType(String(req.params.type || ""));
    const id = String(req.params.id || "");

    if (!isValidContentType(typeParam)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid content id" });
    }

    const modelMap: Record<ContentType, any> = {
      LESSON: Lesson,
      DIALOGUE: Dialogue,
      WRITING: WritingExercise,
      SPEAKING: SpeakingExercise,
      QUESTION: Question,
      TOPIC: Topic,
    };

    const model = modelMap[typeParam];
    const doc = await model.findById(id);

    if (!doc) {
      return res.status(404).json({ message: "Content not found" });
    }

    if (typeParam === "TOPIC") {
      doc.isPublished = false;
    } else {
      doc.isVerified = false;
      doc.status = "DRAFT";
    }
    await doc.save();

    return res.json(doc);
  } catch (error: any) {
    console.error("Reject content error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

export const updateContent = async (req: AuthRequest, res: Response) => {
  try {
    const typeParam = normalizeType(String(req.params.type || ""));
    const id = String(req.params.id || "");

    if (!isValidContentType(typeParam)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid content id" });
    }

    const modelMap: Record<ContentType, any> = {
      LESSON: Lesson,
      DIALOGUE: Dialogue,
      WRITING: WritingExercise,
      SPEAKING: SpeakingExercise,
      QUESTION: Question,
      TOPIC: Topic,
    };

    const model = modelMap[typeParam];
    const doc = await model.findById(id);

    if (!doc) {
      return res.status(404).json({ message: "Content not found" });
    }

    // Never override MongoDB specific keys manually to avoid VersionErrors
    const updatedData = { ...req.body };
    delete updatedData._id;
    delete updatedData.__v;
    delete updatedData.createdAt;
    delete updatedData.updatedAt;
    
    // Don't allow modifying status/verification through generic update endpoint
    delete updatedData.status;
    delete updatedData.isVerified;

    Object.assign(doc, updatedData);
    await doc.save();

    return res.json(doc);
  } catch (error: any) {
    console.error("Update content error:", error);
    return res.status(500).json({ message: "Server error", details: error?.message });
  }
};

import { SystemConfig } from "../admin/systemConfig.model";

export const generateContent = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Check Global System Config to see if AI Generation is allowed
    const config = await SystemConfig.getSingleton();
    if (!config.isAIGenerationEnabled) {
      return res.status(403).json({ 
        message: "AI Content Generation is currently disabled by the Platform Admin." 
      });
    }

    const { type, topicId, level, lessonId } = req.body as {
      type?: string;
      topicId?: string;
      level?: string;
      lessonId?: string;
    };

    const normalizedType = normalizeType(type);

    if (!normalizedType) {
      return res.status(400).json({ message: "type is required" });
    }

    if (!isValidContentType(normalizedType)) {
      return res.status(400).json({ message: "Invalid content type" });
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (normalizedType === "TOPIC") {
      const { theme, section, level: levelOverride } = req.body as {
        theme?: string;
        section?: string;
        level?: string;
      };

      if (!theme || typeof theme !== "string" || theme.trim().length < 2) {
        return res.status(400).json({
          message: "theme is required (e.g. 'Greetings', 'Food')",
        });
      }

      const resolvedSection = section?.toUpperCase() || "A1";
      const resolvedLevel = levelOverride?.trim() || "BEGINNER";
      const trimmedTheme = theme.trim();

      const fakeTopic = { title: { am: trimmedTheme, ao: trimmedTheme } };
      const prompt = buildPrompt("TOPIC", fakeTopic, resolvedSection);
      const generated = await ExpertContentGenerator.generateFromPrompt(prompt);

      const slugBase = generated?.title?.ao || generated?.title?.am || trimmedTheme;
      const slug = generateSlug(slugBase);

      const topic = await Topic.create({
        ...generated,
        slug,
        level: resolvedLevel,
        section: resolvedSection,
        unitNumber: 0,
        isPublished: false,
        generatedByAI: true,
        authorId: req.user.id,
      });

      return res.status(201).json(topic);
    }

    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    const topic = await Topic.findById(topicId).select("level").lean();

    if (!topic) {
      return res.status(404).json({ message: "Topic not found" });
    }

    const resolvedLevel = typeof level === "string" && level.trim() ? level.trim() : topic.level;

    const generated = await ExpertContentGenerator.generate(
      normalizedType,
      topicId,
      resolvedLevel,
    );

    const baseFields = {
      topicId,
      generatedByAI: true,
      status: "NEEDS_REVIEW" as const,
      isVerified: false,
      authorId: req.user.id,
    };

    let created: any;

    switch (normalizedType) {
      case "LESSON": {
        const latestLesson = await Lesson.findOne({ topicId })
          .sort({ order: -1 })
          .select("order")
          .lean();
        const nextOrder = (latestLesson?.order ?? 0) + 1;

        const { quiz, ...lessonData } = generated;

        const lessonDoc = await Lesson.create({
          ...lessonData,
          ...baseFields,
          order: nextOrder,
        });

        let createdResponse: any = lessonDoc.toObject();

        if (Array.isArray(quiz) && quiz.length > 0) {
          const QUESTION_TYPES = ["MULTIPLE_CHOICE", "MATCHING", "SCRAMBLE", "CLOZE"];
          const QUESTION_INTENDED_FOR = ["LESSON", "TEST", "BOTH"];
          
          const questionDocs = quiz
            .filter((q) => q && typeof q === "object" && q.content !== undefined)
            .map((q) => ({
              lessonId: lessonDoc._id,
              intendedFor: QUESTION_INTENDED_FOR.includes(q.intendedFor) ? q.intendedFor : "LESSON",
              type: QUESTION_TYPES.includes(q.type) ? q.type : "MULTIPLE_CHOICE",
              content: q.content,
              ...baseFields,
            }));

          if (questionDocs.length > 0) {
            const insertedQuestions = await Question.insertMany(questionDocs);
            createdResponse.quiz = insertedQuestions;
          }
        }
        
        created = createdResponse;
        break;
      }
      case "DIALOGUE": {
        created = await Dialogue.create({
          ...generated,
          ...baseFields,
          level: resolvedLevel,
        });
        break;
      }
      case "WRITING": {
        created = await WritingExercise.create({
          ...generated,
          ...baseFields,
          level: resolvedLevel,
        });
        break;
      }
      case "SPEAKING": {
        created = await SpeakingExercise.create({
          ...generated,
          ...baseFields,
          level: resolvedLevel,
        });
        break;
      }
      case "QUESTION": {
        if (!Array.isArray(generated)) {
          throw new ExpertGeneratorError("Question generation failed", 502);
        }

        const docs = generated.map((item: any) => ({
          ...item,
          ...baseFields,
          ...(isValidObjectId(lessonId) ? { lessonId } : {}),
        }));

        created = await Question.insertMany(docs);
        break;
      }
      default:
        return res.status(400).json({ message: "Invalid content type" });
    }

    return res.status(201).json(created);
  } catch (error: any) {
    console.error("Generate content error:", error);

    if (error instanceof ExpertGeneratorError) {
      const statusCode = error.statusCode >= 500 ? 502 : error.statusCode;
      return res
        .status(statusCode)
        .json({ message: error.message, details: error.details });
    }

    return res.status(502).json({ message: "AI generation failed", details: error?.message });
  }
};
