import { GoogleGenerativeAI } from "@google/generative-ai";

export interface VideoCandidate {
  youtubeId: string;
  title: string;
  description?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
}

export interface RankedVideoCandidate {
  youtubeId: string;
  relevanceScore: number;
}

export class AIServiceError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";
const RETRY_DELAYS_MS = [250, 700];

type GeminiResponseMimeType = "application/json" | "text/plain";

export class AIService {
  private static async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static getModel(modelName: string, responseMimeType?: GeminiResponseMimeType) {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      throw new AIServiceError("Missing GEMINI_API_KEY in environment", 500);
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        ...(responseMimeType ? { responseMimeType } : {}),
        temperature: 0.3,
      },
    });
  }

  private static isTransientGeminiError(error: any) {
    const code = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || "");

    return (
      code === 503 ||
      /Service Unavailable|currently experiencing high demand|temporar|unavailable/i.test(
        message,
      )
    );
  }

  private static classifyGeminiError(error: any): AIServiceError {
    const code = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || "Failed to generate AI response");

    if (
      code === 429 ||
      /RESOURCE_EXHAUSTED|quota exceeded|rate limit|too many requests/i.test(message)
    ) {
      return new AIServiceError("Gemini API rate limit reached", 429);
    }

    if (/model.*not found|unknown model|unsupported model/i.test(message)) {
      return new AIServiceError(`Gemini model is unavailable: ${GEMINI_MODEL}`, 400, message);
    }

    if (code === 503 || /Service Unavailable|currently experiencing high demand/i.test(message)) {
      return new AIServiceError(
        "Gemini service is temporarily overloaded. Please retry shortly.",
        503,
        message,
      );
    }

    if (/SAFETY|blocked|filter/i.test(message)) {
      return new AIServiceError("Prompt blocked by AI safety filters", 400);
    }

    if (/token|context length|input.*too long|max.*tokens|prompt.*too long/i.test(message)) {
      return new AIServiceError("Prompt is too large for the selected Gemini model", 400);
    }

    if (/API key|invalid key|permission|forbidden|unauthorized|auth/i.test(message)) {
      return new AIServiceError("Gemini API authentication failed", 401, message);
    }

    return new AIServiceError("Gemini API request failed", 502, message);
  }

  private static parseJsonResponse(text: string): any {
    const trimmed = text.trim();

    if (!trimmed) {
      throw new AIServiceError("Empty AI response", 502);
    }

    try {
      return JSON.parse(trimmed);
    } catch {
      const cleaned = trimmed
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();

      try {
        return JSON.parse(cleaned);
      } catch (error: any) {
        throw new AIServiceError("Invalid JSON returned by AI", 502, error?.message);
      }
    }
  }

  static async generateVideoSearchQuery(
    topicTitle: string,
    targetLanguage: string,
    level: string,
  ): Promise<string> {
    const title = (topicTitle || "").trim();
    const language = (targetLanguage || "").trim();
    const difficulty = (level || "").trim();

    if (!title) {
      throw new AIServiceError("topicTitle is required", 400);
    }

    if (!language) {
      throw new AIServiceError("targetLanguage is required", 400);
    }

    if (!difficulty) {
      throw new AIServiceError("level is required", 400);
    }

    const prompt = `You are an expert YouTube search strategist for language learners.
Create ONE high-intent YouTube search query to find educational videos.
Topic: ${title}
Target language: ${language}
Level: ${difficulty}
Return only the search query. Do not add quotes, punctuation, or extra commentary.`;

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = this.getModel(modelName, "text/plain");

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const raw = result.response.text();
          const query = raw
            .replace(/^['"`]+/, "")
            .replace(/['"`]+$/, "")
            .replace(/\s+/g, " ")
            .trim();

          if (!query) {
            throw new AIServiceError("Empty AI response", 502);
          }

          return query;
        } catch (error: any) {
          if (error instanceof AIServiceError) {
            throw error;
          }

          lastError = error;

          const canRetry = this.isTransientGeminiError(error) && attempt < RETRY_DELAYS_MS.length;
          if (canRetry) {
            await this.sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }

          if (!this.isTransientGeminiError(error)) {
            throw this.classifyGeminiError(error);
          }

          break;
        }
      }
    }

    throw this.classifyGeminiError(lastError);
  }

  static async generateSearchQueryForLanguage(
    topicTitle: string,
    language: string,
    level: string,
  ): Promise<string> {
    const title = (topicTitle || "").trim();
    const lang = (language || "").trim();
    const difficulty = (level || "").trim();

    if (!title) {
      throw new AIServiceError("topicTitle is required", 400);
    }

    if (!lang) {
      throw new AIServiceError("language is required", 400);
    }

    if (!difficulty) {
      throw new AIServiceError("level is required", 400);
    }

    const prompt = `You are an expert ${lang} language teacher.
Generate a highly optimized YouTube search query to find listening practice videos for a ${difficulty} student.
Topic: ${title}
Target language for the video content: ${lang}

The search query should help find YouTube videos where the MAIN spoken or written language is ${lang}.
Return ONLY the raw search string. No quotes, no explanation. Max 10 words.`;

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = this.getModel(modelName, "text/plain");

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const raw = result.response.text();
          const query = raw
            .replace(/^['"`]+/, "")
            .replace(/['"`]+$/, "")
            .replace(/\s+/g, " ")
            .trim();

          if (!query) {
            throw new AIServiceError("Empty AI response", 502);
          }

          return query;
        } catch (error: any) {
          if (error instanceof AIServiceError) {
            throw error;
          }

          lastError = error;

          const canRetry = this.isTransientGeminiError(error) && attempt < RETRY_DELAYS_MS.length;
          if (canRetry) {
            await this.sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }

          if (!this.isTransientGeminiError(error)) {
            throw this.classifyGeminiError(error);
          }

          break;
        }
      }
    }

    throw this.classifyGeminiError(lastError);
  }

  static async rankVideoCandidates(
    videoList: VideoCandidate[],
    topicContext: string,
  ): Promise<RankedVideoCandidate[]> {
    if (!Array.isArray(videoList) || videoList.length === 0) {
      return [];
    }

    const candidates = videoList
      .map((video) => ({
        youtubeId: String(video.youtubeId || "").trim(),
        title: String(video.title || "").trim(),
        description: String(video.description || "").trim(),
        channelTitle: String(video.channelTitle || "").trim(),
      }))
      .filter((video) => video.youtubeId && video.title);

    if (candidates.length === 0) {
      return [];
    }

    const prompt = `You are a language-learning content curator.
Evaluate the YouTube video candidates and keep ONLY the educational videos relevant to:
${topicContext}

Filter out music videos, entertainment, news, vlogs, shorts, or unrelated content.
Return ONLY a JSON array with items shaped exactly like:
{ "youtubeId": "...", "relevanceScore": 0 }

Use an integer relevanceScore between 0 and 10.
Include only relevant educational items.

Candidates:
${JSON.stringify(candidates, null, 2)}`;

    const allowedIds = new Set(candidates.map((candidate) => candidate.youtubeId));

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = this.getModel(modelName, "application/json");

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const raw = result.response.text();
          const parsed = this.parseJsonResponse(raw);

          if (!Array.isArray(parsed)) {
            throw new AIServiceError("Invalid AI JSON schema: expected an array", 502);
          }

          const ranked: RankedVideoCandidate[] = [];

          for (const item of parsed) {
            const youtubeId = String(item?.youtubeId || "").trim();
            const score = Number(item?.relevanceScore);

            if (!youtubeId || !allowedIds.has(youtubeId)) {
              continue;
            }

            if (!Number.isFinite(score)) {
              continue;
            }

            ranked.push({
              youtubeId,
              relevanceScore: Math.max(0, Math.min(10, Math.round(score))),
            });
          }

          return ranked;
        } catch (error: any) {
          if (error instanceof AIServiceError) {
            throw error;
          }

          lastError = error;

          const canRetry = this.isTransientGeminiError(error) && attempt < RETRY_DELAYS_MS.length;
          if (canRetry) {
            await this.sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }

          if (!this.isTransientGeminiError(error)) {
            throw this.classifyGeminiError(error);
          }

          break;
        }
      }
    }

    throw this.classifyGeminiError(lastError);
  }
}
