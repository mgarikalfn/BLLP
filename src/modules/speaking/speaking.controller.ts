import { Request, Response } from "express";
import mongoose from "mongoose";
import { SpeakingEvaluationService } from "./speakingEvaluation.service";
import { SpeakingAttempt } from "./speakingAttempt.model";
import { SpeakingExercise } from "./speakingExercise.model";
import { Progress } from "../study/progress.model";

const speakingLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

const isValidSpeakingLevel = (value: unknown): value is (typeof speakingLevels)[number] => {
  return typeof value === "string" && speakingLevels.includes(value as (typeof speakingLevels)[number]);
};

const isValidBilingualInput = (value: unknown): value is { am: string; ao: string } => {
  if (!value || typeof value !== "object") return false;

  const bilingual = value as Record<string, unknown>;
  return (
    typeof bilingual.am === "string" && bilingual.am.trim().length > 0 &&
    typeof bilingual.ao === "string" && bilingual.ao.trim().length > 0
  );
};

const normalizeAudioMimeType = (file: { mimetype?: string; originalname?: string }) => {
  const incoming = (file.mimetype || "").toLowerCase();

  if (incoming === "audio/x-wav") return "audio/wav";
  if (incoming === "audio/mp3") return "audio/mpeg";
  if (incoming && incoming !== "application/octet-stream") return incoming;

  const extension = (file.originalname || "").split(".").pop()?.toLowerCase();

  if (extension === "wav") return "audio/wav";
  if (extension === "mp3") return "audio/mpeg";
  if (extension === "ogg") return "audio/ogg";
  if (extension === "webm") return "audio/webm";
  if (extension === "m4a") return "audio/mp4";

  return incoming || "";
};

const submitResponseMessages = {
  am: {
    missingAudio: "የድምጽ ፋይል አልተላከም።",
    missingFields: "አስፈላጊ መረጃዎች አልተሟሉም: expectedText, targetLang, exerciseId።",
    invalidTargetLang: "targetLang ዋጋ ልክ አይደለም። 'am' ወይም 'ao' መሆን አለበት።",
    unsupportedAudio: "ያልተደገፈ የድምጽ ፎርማት። wav, mp3, ogg, webm, ወይም m4a ይጠቀሙ።",
    fallbackFeedback: "ድምፅዎን በግልጽ ሁኔታ መቅረጽ እንዲሁም እንደገና መሞከር ይችላሉ።",
    noSpeechDetected: "ከድምጽ ፋይሉ ውስጥ ንግግር አልተገኘም። በግልጽ ድምጽ እንደገና ይሞክሩ።",
    evaluated: "የንግግር ግምገማ ተጠናቋል።",
    serverError: "በድምጽ ግምገማ ሂደት ውስጥ የውስጥ ስህተት ተፈጥሯል።",
  },
  ao: {
    missingAudio: "Faayiliin sagalee hin ergamne.",
    missingFields: "Odeeffannoon barbaachisu guutuu miti: expectedText, targetLang, exerciseId.",
    invalidTargetLang: "Gatiin targetLang sirrii miti. 'am' yookaan 'ao' ta'uu qaba.",
    unsupportedAudio: "Foormaatiin sagalee hin deeggaramne. wav, mp3, ogg, webm, yookaan m4a fayyadami.",
    fallbackFeedback: "Sagalee kee ifatti qabadhuutii irra deebi'ii yaali.",
    noSpeechDetected: "Sagaleen dubbii faayila keessaa hin argamne. Ifatti dubbadhuutii irra deebi'ii yaali.",
    evaluated: "Qorannoon dubbii xumurameera.",
    serverError: "Yeroo qorannoo sagalee rakkoon keessaa uumameera.",
  },
} as const;

// Learner-facing messages should be in the native language (opposite of target language).
const resolveNativeLanguageFromTarget = (value: unknown): "am" | "ao" => {
  if (value === "ao") return "am";
  if (value === "am") return "ao";
  return "am";
};

export const createSpeakingExercise = async (req: Request, res: Response) => {
  try {
    const { topicId, level, prompt, expectedText, referenceAudioUrl, isVerified } = req.body;

    if (!topicId || !mongoose.Types.ObjectId.isValid(String(topicId))) {
      return res.status(400).json({ success: false, message: "Valid topicId is required." });
    }

    if (!isValidBilingualInput(prompt)) {
      return res.status(400).json({
        success: false,
        message: "Prompt is required in both languages (prompt.am and prompt.ao)."
      });
    }

    if (!isValidBilingualInput(expectedText)) {
      return res.status(400).json({
        success: false,
        message: "Expected text is required in both languages (expectedText.am and expectedText.ao)."
      });
    }

    if (level && !isValidSpeakingLevel(level)) {
      return res.status(400).json({ success: false, message: "Invalid level value." });
    }

    const exercise = await SpeakingExercise.create({
      topicId,
      level,
      prompt,
      expectedText,
      referenceAudioUrl,
      isVerified: typeof isVerified === "boolean" ? isVerified : true,
    });

    return res.status(201).json({
      success: true,
      message: "Speaking exercise created successfully.",
      data: exercise,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate speaking exercise." });
    }

    console.error("Create Speaking Exercise Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getAllSpeakingExercises = async (req: Request, res: Response) => {
  try {
    const { topicId, level, verified } = req.query;
    const filter: Record<string, unknown> = {};

    if (typeof topicId === "string") {
      if (!mongoose.Types.ObjectId.isValid(topicId)) {
        return res.status(400).json({ success: false, message: "Invalid topicId." });
      }
      filter.topicId = topicId;
    }

    if (typeof level === "string") {
      if (!isValidSpeakingLevel(level)) {
        return res.status(400).json({ success: false, message: "Invalid level filter." });
      }
      filter.level = level;
    }

    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    const exercises = await SpeakingExercise.find(filter).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: exercises,
    });
  } catch (error: any) {
    console.error("Get Speaking Exercises Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const getSpeakingExerciseById = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid speaking exercise ID." });
    }

    const exercise = await SpeakingExercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Speaking exercise not found." });
    }

    return res.status(200).json({
      success: true,
      data: exercise,
    });
  } catch (error: any) {
    console.error("Get Speaking Exercise By ID Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const updateSpeakingExercise = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid speaking exercise ID." });
    }

    const exercise = await SpeakingExercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Speaking exercise not found." });
    }

    const updatePayload = req.body as Record<string, unknown>;

    delete updatePayload._id;
    delete updatePayload.__v;
    delete updatePayload.createdAt;
    delete updatePayload.updatedAt;

    if (typeof updatePayload.topicId === "string" && !mongoose.Types.ObjectId.isValid(updatePayload.topicId)) {
      return res.status(400).json({ success: false, message: "Invalid topicId." });
    }

    if (typeof updatePayload.level === "string" && !isValidSpeakingLevel(updatePayload.level)) {
      return res.status(400).json({ success: false, message: "Invalid level value." });
    }

    if (updatePayload.prompt && !isValidBilingualInput(updatePayload.prompt)) {
      return res.status(400).json({
        success: false,
        message: "If provided, prompt must include non-empty prompt.am and prompt.ao."
      });
    }

    if (updatePayload.expectedText && !isValidBilingualInput(updatePayload.expectedText)) {
      return res.status(400).json({
        success: false,
        message: "If provided, expectedText must include non-empty expectedText.am and expectedText.ao."
      });
    }

    Object.assign(exercise, updatePayload);
    await exercise.save();

    return res.status(200).json({
      success: true,
      message: "Speaking exercise updated successfully.",
      data: exercise,
    });
  } catch (error: any) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate speaking exercise." });
    }

    console.error("Update Speaking Exercise Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const deleteSpeakingExercise = async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid speaking exercise ID." });
    }

    const exercise = await SpeakingExercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ success: false, message: "Speaking exercise not found." });
    }

    await exercise.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Speaking exercise deleted successfully.",
    });
  } catch (error: any) {
    console.error("Delete Speaking Exercise Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const submitSpeakingExercise = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    const { expectedText, targetLang, exerciseId } = req.body;
    const responseLang = resolveNativeLanguageFromTarget(targetLang);
    const messages = submitResponseMessages[responseLang];

    // 1. Validation
    if (!file) {
      return res.status(400).json({ success: false, message: messages.missingAudio });
    }

    if (!expectedText || !targetLang || !exerciseId) {
      return res.status(400).json({ success: false, message: messages.missingFields });
    }

    if (targetLang !== "am" && targetLang !== "ao") {
      return res.status(400).json({ success: false, message: messages.invalidTargetLang });
    }

    const mimeType = normalizeAudioMimeType(file);
    const supportedMimeTypes = ["audio/wav", "audio/mpeg", "audio/ogg", "audio/webm", "audio/mp4"];

    if (!supportedMimeTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: messages.unsupportedAudio
      });
    }

    // 2. Call the Evaluation Service
    const evaluation = await SpeakingEvaluationService.evaluateSpeaking(
      file.buffer,
      mimeType,
      expectedText,
      targetLang
    );

    // Normalize AI output to avoid runtime/db validation failures on malformed responses.
    const normalizedTranscribedText =
      typeof evaluation?.transcribedText === "string" ? evaluation.transcribedText.trim() : "";
    const normalizedIsCorrect = typeof evaluation?.isCorrect === "boolean" ? evaluation.isCorrect : false;
    const normalizedFeedback =
      typeof evaluation?.feedback === "string" && evaluation.feedback.trim()
        ? evaluation.feedback
        : messages.fallbackFeedback;

    if (!normalizedTranscribedText) {
      return res.status(422).json({
        success: false,
        message: messages.noSpeechDetected,
        data: {
          isCorrect: false,
          transcribedText: "",
          feedback: normalizedFeedback,
        },
      });
    }

    // 3. Save Attempt to Database
    const newAttempt = await SpeakingAttempt.create({
      userId: (req as any).user.id,
      exerciseId, // Extracted from req.body
      targetLanguage: targetLang,
      transcribedText: normalizedTranscribedText,
      isCompleted: normalizedIsCorrect,
      feedback: normalizedFeedback
    });

    // Track speaking progress in polymorphic progress model.
    await Progress.findOneAndUpdate(
      {
        userId: (req as any).user.id,
        contentId: exerciseId,
        contentType: "SPEAKING",
      },
      {
        $set: {
          lastReviewed: new Date(),
          nextReview: new Date(Date.now() + 24 * 60 * 60 * 1000),
          bestScore: normalizedIsCorrect ? 100 : 0,
          repetition: normalizedIsCorrect ? 1 : 0,
          interval: 1,
          easeFactor: 2.5,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    // 4. Return the Evaluation Results
    return res.status(200).json({
      success: true,
      message: messages.evaluated,
      data: {
        isCorrect: normalizedIsCorrect,
        transcribedText: normalizedTranscribedText,
        feedback: normalizedFeedback,
        attemptId: newAttempt._id
      },
    });

  } catch (error) {
    console.error("Speaking Controller Error:", error);
    const errorLang = resolveNativeLanguageFromTarget((req.body as { targetLang?: unknown })?.targetLang);
    return res.status(500).json({ success: false, message: submitResponseMessages[errorLang].serverError });
  }
};
