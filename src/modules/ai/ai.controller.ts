import { Request, Response } from "express";
import {
  AIDictionaryService,
  DictionaryServiceError,
} from "./ai.service";

export const dictionaryLookup = async (req: Request, res: Response) => {
  try {
    const { text, topicId, learningDirection } = req.body;

    const result = await AIDictionaryService.getDictionaryEntry({
      text,
      topicId,
      learningDirection,
    });

    return res.json(result);
  } catch (error: any) {
    if (error instanceof DictionaryServiceError) {
      return res.status(error.statusCode).json({
        message: error.message,
        details: error.details,
      });
    }

    console.error("AI dictionary error:", error);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
