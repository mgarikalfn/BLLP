import { GoogleGenerativeAI } from "@google/generative-ai";
import { Topic } from "../content/topic.model";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";
const RETRY_DELAYS_MS = [250, 700];

export class ExpertGeneratorError extends Error {
  statusCode: number;
  details?: string;

  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

const sleep = async (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const getModel = (modelName: string) => {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw new ExpertGeneratorError("Missing GEMINI_API_KEY in environment", 500);
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.4,
    },
  });
};

const isTransientGeminiError = (error: any) => {
  const code = Number(error?.status || error?.statusCode || 0);
  const message = String(error?.message || "");

  return (
    code === 503 ||
    /Service Unavailable|currently experiencing high demand|temporar|unavailable/i.test(
      message,
    )
  );
};

const parseJsonResponse = (text: string) => {
  const trimmed = text.trim();

  if (!trimmed) {
    throw new ExpertGeneratorError("Empty AI response", 502);
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
      throw new ExpertGeneratorError("Invalid JSON returned by AI", 502, error?.message);
    }
  }
};

export const buildPrompt = (type: string, topic: { title: { am: string; ao: string } }, level: string) => {
  const topicTitle = `${topic.title.am} / ${topic.title.ao}`;

  switch (type) {
    case "LESSON":
      return `You are a bilingual language curriculum designer for Amharic and Afan Oromo.
Generate a lesson for the topic "${topicTitle}" at ${level} level.

Return ONLY valid JSON matching this exact structure:
{
  "title": { "am": "...", "ao": "..." },
  "grammarNotes": { "am": "...", "ao": "..." },
  "vocabulary": [
    {
      "am": "Amharic word",
      "ao": "Afan Oromo word",
      "example": { "am": "Example sentence in Amharic", "ao": "Example sentence in Oromo" }
    }
  ],
  "dialogue": [
    { "speaker": "Speaker name", "text": { "am": "...", "ao": "..." } }
  ],
  "quiz": [
    {
      "type": "MULTIPLE_CHOICE",
      "intendedFor": "LESSON",
      "content": {
        "question": { "am": "...", "ao": "..." },
        "options": [{ "am": "...", "ao": "..." }],
        "correctIndex": 0
      }
    }
  ]
}

Generate exactly 3-5 vocabulary items, exactly 2-3 dialogue lines (grammar illustrations only, NOT a conversation feature - they demonstrate the vocabulary in context), and exactly 2 quiz questions. Keep each vocabulary example sentence under 10 words. Both quiz questions must test a specific word from this lesson's vocabulary. The quiz array must contain exactly 2 objects.
The "quiz" array MUST contain exactly 2 objects. Each object must use ONE of the following formats:
1) MULTIPLE_CHOICE: { "type": "MULTIPLE_CHOICE", "intendedFor": "LESSON", "content": { "question": { "am": "...", "ao": "..." }, "options": [{ "am": "...", "ao": "..." }], "correctIndex": 0 } }
2) MATCHING: { "type": "MATCHING", "intendedFor": "LESSON", "content": { "prompt": { "am": "...", "ao": "..." }, "pairs": [{ "left": "...", "right": "..." }] } }
3) SCRAMBLE: { "type": "SCRAMBLE", "intendedFor": "LESSON", "content": { "prompt": { "am": "...", "ao": "..." }, "scrambled": ["...", "...", "..."], "answer": "..." } }
4) CLOZE: { "type": "CLOZE", "intendedFor": "LESSON", "content": { "sentence": { "am": "_____...", "ao": "_____..." }, "answer": { "am": "...", "ao": "..." } } }

All text must be authentic, natural language, not transliteration.`;

    case "DIALOGUE":
      return `You are a bilingual dialogue writer for Amharic and Afan Oromo.
Generate an interactive dialogue for the topic "${topicTitle}" at ${level} level.

Return ONLY valid JSON matching this exact structure:
{
  "scenario": { "am": "Scene description in Amharic", "ao": "Scene description in Oromo" },
  "characters": [
    { "characterId": "char1", "name": "Character Name" },
    { "characterId": "char2", "name": "Character Name" }
  ],
  "lines": [
    {
      "order": 1,
      "characterId": "char1",
      "content": { "am": "...", "ao": "..." },
      "isInteractive": false
    },
    {
      "order": 2,
      "characterId": "char2",
      "content": { "am": "...", "ao": "..." },
      "isInteractive": true,
      "question": { "am": "What should you say?", "ao": "Maal jechuu qabda?" },
      "options": [
        { "am": "Option 1 am", "ao": "Option 1 ao" },
        { "am": "Option 2 am", "ao": "Option 2 ao" },
        { "am": "Option 3 am", "ao": "Option 3 ao" }
      ],
      "correctAnswerIndex": 0
    }
  ]
}
Generate 6-8 dialogue lines. Make 2-3 of them interactive with questions. Use realistic conversational language.`;

    case "WRITING":
      return `You are a bilingual writing exercise designer for Amharic and Afan Oromo.
Generate a writing exercise for the topic "${topicTitle}" at ${level} level.

Return ONLY valid JSON matching this exact structure. Note the type can be either "TRANSLATION" or "OPEN_PROMPT":
{
  "type": "TRANSLATION", // or "OPEN_PROMPT"
  "prompt": { "am": "The instruction or open ended prompt in Amharic", "ao": "The instruction or open ended prompt in Oromo" },
  "hints": [
    { "am": "Hint in Amharic", "ao": "Hint in Oromo" }
  ],
  "sampleAnswer": { "am": "Expected answer in Amharic", "ao": "Expected answer in Oromo" }
}`;

    case "SPEAKING":
      return `You are a bilingual pronunciation coach for Amharic and Afan Oromo.
Generate a speaking exercise for the topic "${topicTitle}" at ${level} level.

Return ONLY valid JSON matching this exact structure:
{
  "prompt": { "am": "Instruction telling user what to say in Amharic", "ao": "Same in Oromo" },
  "expectedText": { "am": "The exact phrase to pronounce in Amharic", "ao": "The exact phrase in Oromo" }
}`;

    case "QUESTION":
      return `You are a bilingual quiz question designer for Amharic and Afan Oromo.
Generate 3 quiz questions for the topic "${topicTitle}" at ${level} level.

Return ONLY a valid JSON array. Each question must match ONE of these types:

Type "MULTIPLE_CHOICE":
{ "type": "MULTIPLE_CHOICE", "intendedFor": "LESSON", "content": { "question": { "am": "...", "ao": "..." }, "options": [{ "am": "...", "ao": "..." }], "correctIndex": 0 } }

Type "MATCHING":
{ "type": "MATCHING", "intendedFor": "TEST", "content": { "prompt": { "am": "...", "ao": "..." }, "pairs": [{ "left": "Amharic word", "right": "Oromo translation" }] } }

Type "SCRAMBLE":
{ "type": "SCRAMBLE", "intendedFor": "LESSON", "content": { "prompt": { "am": "...", "ao": "..." }, "scrambled": ["...", "...", "..."], "answer": "..." } }

Type "CLOZE":
{ "type": "CLOZE", "intendedFor": "LESSON", "content": { "sentence": { "am": "_____...", "ao": "_____..." }, "answer": { "am": "...", "ao": "..." } } }

Mix the types. Generate exactly 3 questions.`;

    case "TOPIC":
      return `You are a bilingual curriculum designer for Amharic and Afan Oromo.
Generate a learning topic for the theme "${topicTitle}" at ${level} level (CEFR section: ${level}).

Return ONLY valid JSON matching this exact structure:
{
  "title": {
    "am": "Topic title in Amharic (short, 2-4 words)",
    "ao": "Topic title in Afan Oromo (short, 2-4 words)"
  },
  "description": {
    "am": "1-2 sentence description of what learners will learn, written in Amharic",
    "ao": "1-2 sentence description of what learners will learn, written in Afan Oromo"
  },
  "tips": {
    "am": "A brief grammar or vocabulary tip in Amharic. Explain a key pattern, rule, or cultural note relevant to this topic. Use simple language. 2-4 sentences max. Include 1-2 short example sentences to illustrate.",
    "ao": "The same tip written in Afan Oromo. 2-4 sentences max. Include the same examples."
  }
}

The tips field is equivalent to Duolingo's 'Tips' feature - it appears as a lightbulb icon
on the topic card and opens a modal before learners start their first lesson.
Write tips as if explaining to a complete beginner. Use encouraging, clear language.
All text must be authentic natural language, not transliteration.`;

    default:
      throw new ExpertGeneratorError("Unsupported content type", 400);
  }
};

export class ExpertContentGenerator {
  static async generateFromPrompt(prompt: string): Promise<any> {
    const modelsToTry = [GEMINI_MODEL, GEMINI_FALLBACK_MODEL].filter(
      (model, index, list) => !!model && list.indexOf(model) === index,
    );

    let lastError: any = null;

    for (const modelName of modelsToTry) {
      const model = getModel(modelName);

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(prompt);
          const raw = result.response.text();
          return parseJsonResponse(raw);
        } catch (error: any) {
          lastError = error;

          const canRetry = isTransientGeminiError(error) && attempt < RETRY_DELAYS_MS.length;
          if (canRetry) {
            await sleep(RETRY_DELAYS_MS[attempt]);
            continue;
          }

          break;
        }
      }
    }

    const details = lastError?.message ? String(lastError.message) : "Gemini request failed";
    throw new ExpertGeneratorError("Gemini generation failed", 502, details);
  }

  static async generate(type: string, topicId: string, level: string): Promise<any> {
    const topic = await Topic.findById(topicId).select("title").lean();

    if (!topic) {
      throw new ExpertGeneratorError("Topic not found", 404);
    }

    const normalizedType = type.toUpperCase();
    const prompt = buildPrompt(normalizedType, topic, level);
    return this.generateFromPrompt(prompt);
  }
}
