import { Request, Response } from "express";
import { Types } from "mongoose";
import { Question } from "./question.model";

const QUESTION_TYPES = ["MULTIPLE_CHOICE", "MATCHING", "SCRAMBLE", "CLOZE"] as const;
const QUESTION_INTENDED_FOR = ["LESSON", "TEST", "BOTH"] as const;

const isValidObjectId = (value?: string) => !!value && Types.ObjectId.isValid(value);
const asParam = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const createQuestion = async (req: Request, res: Response) => {
  try {
    const { topicId, lessonId, intendedFor, type, content, isVerified } = req.body;

    if (!isValidObjectId(topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    if (lessonId && !isValidObjectId(lessonId)) {
      return res.status(400).json({ message: "Invalid lessonId" });
    }

    if (!content) {
      return res.status(400).json({ message: "Question content is required" });
    }

    const question = await Question.create({
      topicId,
      lessonId,
      intendedFor: QUESTION_INTENDED_FOR.includes(intendedFor) ? intendedFor : "LESSON",
      type: QUESTION_TYPES.includes(type) ? type : "MULTIPLE_CHOICE",
      content,
      isVerified: typeof isVerified === "boolean" ? isVerified : false,
    });

    return res.status(201).json(question);
  } catch (error: any) {
    console.error("CREATE QUESTION ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getQuestions = async (req: Request, res: Response) => {
  try {
    const { topicId, lessonId, intendedFor, type, isVerified, page = "1", limit = "20" } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof topicId === "string" && isValidObjectId(topicId)) {
      filter.topicId = topicId;
    }

    if (typeof lessonId === "string" && isValidObjectId(lessonId)) {
      filter.lessonId = lessonId;
    }

    if (typeof intendedFor === "string" && QUESTION_INTENDED_FOR.includes(intendedFor as any)) {
      filter.intendedFor = intendedFor;
    }

    if (typeof type === "string" && QUESTION_TYPES.includes(type as any)) {
      filter.type = type;
    }

    if (isVerified === "true" || isVerified === "false") {
      filter.isVerified = isVerified === "true";
    }

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (pageNumber - 1) * pageLimit;

    const [questions, total] = await Promise.all([
      Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(pageLimit),
      Question.countDocuments(filter),
    ]);

    return res.json({
      total,
      page: pageNumber,
      limit: pageLimit,
      totalPages: Math.ceil(total / pageLimit),
      data: questions,
    });
  } catch (error: any) {
    console.error("GET QUESTIONS ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const getQuestionById = async (req: Request, res: Response) => {
  try {
    const id = asParam(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.json(question);
  } catch (error: any) {
    console.error("GET QUESTION BY ID ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const updateQuestion = async (req: Request, res: Response) => {
  try {
    const id = asParam(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    const updatePayload = { ...req.body };

    delete (updatePayload as any)._id;
    delete (updatePayload as any).__v;
    delete (updatePayload as any).createdAt;
    delete (updatePayload as any).updatedAt;

    if (updatePayload.topicId && !isValidObjectId(updatePayload.topicId)) {
      return res.status(400).json({ message: "Invalid topicId" });
    }

    if (updatePayload.lessonId && !isValidObjectId(updatePayload.lessonId)) {
      return res.status(400).json({ message: "Invalid lessonId" });
    }

    if (
      updatePayload.intendedFor &&
      !QUESTION_INTENDED_FOR.includes(updatePayload.intendedFor)
    ) {
      return res.status(400).json({ message: "Invalid intendedFor value" });
    }

    if (updatePayload.type && !QUESTION_TYPES.includes(updatePayload.type)) {
      return res.status(400).json({ message: "Invalid question type" });
    }

    const question = await Question.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.json(question);
  } catch (error: any) {
    console.error("UPDATE QUESTION ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const deleteQuestion = async (req: Request, res: Response) => {
  try {
    const id = asParam(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    const question = await Question.findByIdAndDelete(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    return res.json({ message: "Question deleted" });
  } catch (error: any) {
    console.error("DELETE QUESTION ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const toggleQuestionVerification = async (req: Request, res: Response) => {
  try {
    const id = asParam(req.params.id);

    if (!isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid question id" });
    }

    const question = await Question.findById(id);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    question.isVerified = !question.isVerified;
    await question.save();

    return res.json({ message: "Question verification updated", isVerified: question.isVerified });
  } catch (error: any) {
    console.error("TOGGLE QUESTION VERIFY ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};
