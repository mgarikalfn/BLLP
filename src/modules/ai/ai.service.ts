import { GoogleGenerativeAI } from "@google/generative-ai";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";

export type LearningDirection = "AM_TO_OR" | "OR_TO_AM";

export interface DictionaryRequestInput {
  text: string;
  topicId?: string;
  learningDirection: string;
}

export interface DictionaryResult {
  translation: string;
  pronunciation_hint: string;
  usage_example: string;
  tip: string;
}

export interface ChatMessageInput {
  role: "user" | "model";
  content: string;
}

export interface ChatRequestInput {
  messages: ChatMessageInput[];
  topicId?: string;
  learningDirection: string;
}

export interface ChatResult {
  response: string;
}

class DictionaryServiceError extends Error {
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
const MAX_GRAMMAR_NOTES_LENGTH = 1200;
const RETRY_DELAYS_MS = [250, 700];

export class AIDictionaryService {
  private static async sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static getModel(
    modelName: string,
    options?: { responseMimeType?: "application/json" | "text/plain" },
  ) {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();

    if (!apiKey) {
      throw new DictionaryServiceError(
        "Missing GEMINI_API_KEY in environment",
        500,
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    return genAI.getGenerativeModel({
      model: modelName,
      generationConfig: {
        ...(options?.responseMimeType
          ? { responseMimeType: options.responseMimeType }
          : {}),
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

  private static normalizeDirection(direction: string): LearningDirection {
    if (direction === "AM_TO_OR" || direction === "OR_TO_AM") {
      return direction;
    }

    throw new DictionaryServiceError(
      "learningDirection must be AM_TO_OR or OR_TO_AM",
      400,
    );
  }

  private static getLanguagePair(direction: LearningDirection) {
    if (direction === "AM_TO_OR") {
      return {
        nativeLang: "Amharic",
        targetLang: "Afan Oromo",
      };
    }

    return {
      nativeLang: "Afan Oromo",
      targetLang: "Amharic",
    };
  }

  private static async getTopicContext(topicId?: string) {
    if (!topicId) {
      return {
        topicTitle: "General vocabulary",
        grammarNotes: "No specific grammar notes available.",
      };
    }

    const topic = await Topic.findById(topicId).select("title").lean();

    if (!topic) {
      throw new DictionaryServiceError("Topic not found", 404);
    }

    const lessons = await Lesson.find({ topicId })
      .select("grammarNotes")
      .lean();

    const notes = lessons
      .flatMap((lesson: any) => {
        const grammarNotes = lesson.grammarNotes;

        if (!grammarNotes) {
          return [];
        }

        const chunks: string[] = [];

        if (grammarNotes.am) {
          chunks.push(`AM: ${grammarNotes.am}`);
        }

        if (grammarNotes.ao) {
          chunks.push(`AO: ${grammarNotes.ao}`);
        }

        return chunks;
      })
      .filter(Boolean)
      .slice(0, 6);

    return {
      topicTitle: `${topic.title.am} / ${topic.title.ao}`,
      grammarNotes:
        notes.length > 0
          ? notes.join(" | ").slice(0, MAX_GRAMMAR_NOTES_LENGTH)
          : "No specific grammar notes available.",
    };
  }

  private static classifyGeminiError(error: any): DictionaryServiceError {
    const code = Number(error?.status || error?.statusCode || 0);
    const message = String(error?.message || "Failed to generate dictionary entry");

    // Only treat as rate-limit when it's an explicit 429/quota exhaustion signal.
    if (
      code === 429 ||
      /RESOURCE_EXHAUSTED|quota exceeded|rate limit|too many requests/i.test(message)
    ) {
      return new DictionaryServiceError("Gemini API rate limit reached", 429);
    }

    if (/model.*not found|unknown model|unsupported model/i.test(message)) {
      return new DictionaryServiceError(
        `Gemini model is unavailable: ${GEMINI_MODEL}`,
        400,
        message,
      );
    }

    if (code === 503 || /Service Unavailable|currently experiencing high demand/i.test(message)) {
      return new DictionaryServiceError(
        "Gemini service is temporarily overloaded. Please retry shortly.",
        503,
        message,
      );
    }

    if (/SAFETY|blocked|filter/i.test(message)) {
      return new DictionaryServiceError("Prompt blocked by AI safety filters", 400);
    }

    if (/token|context length|input.*too long|max.*tokens|prompt.*too long/i.test(message)) {
      return new DictionaryServiceError(
        "Prompt is too large for the selected Gemini model",
        400,
      );
    }

    if (/API key|invalid key|permission|forbidden|unauthorized|auth/i.test(message)) {
      return new DictionaryServiceError("Gemini API authentication failed", 401, message);
    }

    return new DictionaryServiceError("Gemini API request failed", 502, message);
  }

  private static parseAndValidate(text: string): DictionaryResult {
    let parsed: any;
    try {
      parsed = JSON.parse(text.trim());
    } catch {
      // Some model responses may include code fences despite JSON mode.
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    }

    const keys: Array<keyof DictionaryResult> = [
      "translation",
      "pronunciation_hint",
      "usage_example",
      "tip",
    ];

    for (const key of keys) {
      if (typeof parsed[key] !== "string" || !parsed[key].trim()) {
        throw new DictionaryServiceError(
          `Invalid AI JSON schema: ${key} must be a non-empty string`,
          502,
        );
      }
    }

    return {
      translation: parsed.translation.trim(),
      pronunciation_hint: parsed.pronunciation_hint.trim(),
      usage_example: parsed.usage_example.trim(),
      tip: parsed.tip.trim(),
    };
  }

  static async getDictionaryEntry(
    input: DictionaryRequestInput,
  ): Promise<DictionaryResult> {
    const text = (input.text || "").trim();

    if (!text) {
      throw new DictionaryServiceError("text is required", 400);
    }

    const direction = this.normalizeDirection(input.learningDirection);
    const { nativeLang, targetLang } = this.getLanguagePair(direction);
    const { topicTitle, grammarNotes } = await this.getTopicContext(input.topicId);

    const systemPrompt = `You are a bilingual tutor.
The user is a native ${nativeLang} speaker learning ${targetLang}.
Current topic: ${topicTitle}
Relevant grammar notes: ${grammarNotes}
Explain the word "${text}" ONLY in ${nativeLang}.
Do not use English words in explanations, tips, or reasoning.

Return ONLY a strict JSON object:
{
  "translation": "The direct translation in ${nativeLang}",
  "pronunciation_hint": "How to say it written in ${nativeLang} script/letters",
  "usage_example": "A sentence in ${targetLang} with its translation in ${nativeLang}",
  "tip": "A one-sentence grammar/cultural tip strictly in ${nativeLang}"
}`;

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = this.getModel(modelName, {
        responseMimeType: "application/json",
      });

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(systemPrompt);
          const raw = result.response.text();
          return this.parseAndValidate(raw);
        } catch (error: any) {
          if (error instanceof DictionaryServiceError) {
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

  static async getChatResponse(input: ChatRequestInput): Promise<ChatResult> {
    const direction = this.normalizeDirection(input.learningDirection);
    const { nativeLang, targetLang } = this.getLanguagePair(direction);
    const { topicTitle, grammarNotes } = await this.getTopicContext(input.topicId);

    if (!Array.isArray(input.messages) || input.messages.length === 0) {
      throw new DictionaryServiceError("messages is required", 400);
    }

    const history = input.messages
      .map((message) => ({
        role: message?.role,
        content: (message?.content || "").trim(),
      }))
      .filter(
        (message): message is ChatMessageInput =>
          (message.role === "user" || message.role === "model") &&
          message.content.length > 0,
      );

    if (history.length === 0) {
      throw new DictionaryServiceError("messages must contain valid content", 400);
    }

    const systemInstruction = `You are a friendly AI Tutor.
The user's native language is ${nativeLang} and they are learning ${targetLang}.
Current topic: ${topicTitle}
Relevant grammar notes: ${grammarNotes}
Speak to the user primarily in ${nativeLang} when explaining rules or giving feedback.
Encourage them to practice in ${targetLang}.
If they make a mistake in ${targetLang}, correct them by explaining WHY using ${nativeLang}.
Strict rule: Do not use English in explanations, tips, or correction logic.`;

    const geminiContents = [
      {
        role: "user" as const,
        parts: [{ text: systemInstruction }],
      },
      {
        role: "model" as const,
        parts: [{ text: `ተቀባይነት አግኝቻለሁ / Hubadhe.` }],
      },
      ...history.map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      })),
    ];

    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = this.getModel(modelName);

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent({
            contents: geminiContents,
          } as any);
          const text = result.response.text().trim();

          if (!text) {
            throw new DictionaryServiceError("Empty AI response", 502);
          }

          return { response: text };
        } catch (error: any) {
          if (error instanceof DictionaryServiceError) {
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

export { DictionaryServiceError };
