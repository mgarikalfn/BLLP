import { Request, Response } from "express";
import { Types } from "mongoose";
import { Topic } from "../content/topic.model";
import { Question } from "../content/question.model";
import { ProficiencyLevel } from "../user/user.model";
import { TestAttempt } from "./testAttempt.model";

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

type QuestionAnswerPayload = {
  questionId: string;
  answerGiven: any;
};

const levelValues = new Set<string>([
  ProficiencyLevel.BEGINNER,
  ProficiencyLevel.INTERMEDIATE,
  ProficiencyLevel.ADVANCED,
]);

const sanitizeObject = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item));
  }

  if (value && typeof value === "object") {
    const copy: Record<string, any> = {};

    for (const [key, val] of Object.entries(value)) {
      const lowered = key.toLowerCase();
      if (
        lowered === "correctanswer" ||
        lowered === "correctanswers" ||
        lowered === "correctindex" ||
        lowered === "correctanswerindex" ||
        lowered === "correctoptionindex" ||
        lowered === "correctoptionindexes" ||
        lowered === "answer" ||
        lowered === "answers" ||
        lowered === "solution"
      ) {
        continue;
      }
      copy[key] = sanitizeObject(val);
    }

    return copy;
  }

  return value;
};

const sanitizeQuestion = (question: any) => {
  return {
    _id: question._id,
    type: question.type,
    content: sanitizeObject(question.content),
  };
};

const normalizeString = (str: any) => {
  if (typeof str !== "string") return "";
  return str.toLowerCase().replace(/[^\w\s\u1200-\u137F]/gi, "").replace(/\s+/g, " ").trim();
};

const isAnswerCorrect = (question: any, answerGiven: any) => {
  const content = question.content;
  if (!content) return false;

  switch (question.type) {
    case "MULTIPLE_CHOICE": {
      const correct = content.correctAnswer || content.answer;
      if (!correct || !answerGiven) return false;
      return (correct.am === answerGiven.am && correct.ao === answerGiven.ao) || 
             (correct.am === answerGiven.text && correct.ao === answerGiven.translation);
    }
    case "MATCHING": {
      if (!Array.isArray(content.pairs) || !Array.isArray(answerGiven)) return false;
      if (content.pairs.length !== answerGiven.length) return false;
      return answerGiven.every((givenPair: any) => 
        content.pairs.some((correctPair: any) => 
          correctPair.left === givenPair.left && correctPair.right === givenPair.right
        )
      );
    }
    case "SCRAMBLE": {
      if (!Array.isArray(answerGiven)) return false;
      const composed = normalizeString(answerGiven.join(" "));
      const expectedAm = normalizeString(content.correctSentence?.am || content.answer?.am);
      const expectedAo = normalizeString(content.correctSentence?.ao || content.answer?.ao);
      return composed === expectedAm || composed === expectedAo;
    }
    case "CLOZE": {
      if (typeof answerGiven !== "string") return false;
      const correctAm = content.correctAnswer?.am;
      const correctAo = content.correctAnswer?.ao;
      return answerGiven === correctAm || answerGiven === correctAo;
    }
    default:
      return false;
  }
};

export const startCertification = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { level } = req.body;
    if (!level || typeof level !== "string" || !levelValues.has(level)) {
      return res.status(400).json({ message: "Invalid level" });
    }

    const topics = await Topic.find({ level }).select("_id").lean();
    const topicIds = topics.map((topic) => topic._id);

    if (topicIds.length === 0) {
      return res.status(404).json({ message: "No topics found for level" });
    }

    const questions = await Question.aggregate([
      {
        $match: {
          topicId: { $in: topicIds },
          intendedFor: { $in: ["TEST", "BOTH"] },
        },
      },
      { $sample: { size: 40 } },
    ]);

    if (questions.length === 0) {
      return res.status(404).json({ message: "No questions available for level" });
    }

    const attempt = await TestAttempt.create({
      userId,
      level,
      status: "IN_PROGRESS",
      questions: questions.map((question: any) => question._id),
    });

    const sanitized = questions.map(sanitizeQuestion);

    return res.json({
      success: true,
      attemptId: attempt._id,
      questions: sanitized,
    });
  } catch (error) {
    console.error("startCertification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const submitCertification = async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  try {
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const attemptId =
      typeof req.params.attemptId === "string" ? req.params.attemptId : req.body.attemptId;
    const answers = req.body.answers as QuestionAnswerPayload[];

    if (!attemptId || !Types.ObjectId.isValid(attemptId)) {
      return res.status(400).json({ message: "Invalid attemptId" });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ message: "answers must be an array" });
    }

    const attempt = await TestAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({ message: "Attempt not found" });
    }

    if (attempt.userId.toString() !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    if (attempt.status === "COMPLETED") {
      return res.status(400).json({ message: "Attempt already completed" });
    }

    const questions = await Question.find({ _id: { $in: attempt.questions } }).lean();
    const questionMap = new Map(questions.map((question: any) => [question._id.toString(), question]));

    let correctCount = 0;
    const userAnswers = answers.map((answer) => {
      const questionId = answer.questionId;
      const question = questionMap.get(questionId);
      const isCorrect = question ? isAnswerCorrect(question, answer.answerGiven) : false;

      if (isCorrect) {
        correctCount += 1;
      }

      return {
        questionId: new Types.ObjectId(questionId),
        answerGiven: answer.answerGiven,
        isCorrect,
      };
    });

    const totalQuestions = attempt.questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= 80;

    attempt.status = "COMPLETED";
    attempt.endTime = new Date();
    attempt.score = score;
    attempt.passed = passed;
    attempt.userAnswers = userAnswers;

    await attempt.save();

    return res.json({
      success: true,
      score,
      passed,
      certificateId: attempt._id,
    });
  } catch (error) {
    console.error("submitCertification error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
