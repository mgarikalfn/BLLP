import { GoogleGenerativeAI } from "@google/generative-ai";
import { Topic } from "../content/topic.model";
import { Lesson } from "../content/lesson.model";

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-2.0-flash";
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
      temperature: 0.7, // Increased from 0.4 for more creative and varied outputs
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

export const buildPrompt = (type: string, topic: { title: { am: string; ao: string } }, level: string, excludedWords: string[] = []) => {
  const topicTitle = `${topic.title.am} / ${topic.title.ao}`;

  let exclusionPrompt = "";
  if (excludedWords.length > 0) {
    exclusionPrompt = `\n\nCRITICAL RESTRICTION: DO NOT USE any of the following vocabulary words as your main teaching focus (they have already been covered): ${excludedWords.join(", ")}. Explore completely NEW vocabulary, sentence structures, and sub-topics.`;
  }

  switch (type) {
    case "LESSON":
      return `You are a bilingual language curriculum designer for Amharic and Afan Oromo.
Generate a lesson for the topic "${topicTitle}" at ${level} level.${exclusionPrompt}

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
      "type": "MULTIPLE_CHOICE", // Can be MULTIPLE_CHOICE, MATCHING, SCRAMBLE, or CLOZE
      "intendedFor": "LESSON",
      "content": {
        // ... structure depends on the type (see rules below)
      }
    }
  ]
}

Generate exactly 3-5 vocabulary items, exactly 2-3 dialogue lines (grammar illustrations only, NOT a conversation feature - they demonstrate the vocabulary in context), and exactly 2 quiz questions. Keep each vocabulary example sentence under 10 words. Both quiz questions must test a specific word from this lesson's vocabulary. The quiz array must contain exactly 2 objects. Mix the question types! Do not just use MULTIPLE_CHOICE.

CRITICAL QUIZ RULES FOR BIDIRECTIONAL LEARNING:
This app serves TWO learner groups: Amharic speakers learning Oromo AND Oromo speakers learning Amharic.
Every quiz question MUST work correctly for BOTH directions. Here is how:

- For MULTIPLE_CHOICE: The "prompt" field MUST be a vocabulary word/phrase as a PARALLEL TRANSLATION pair: { "am": "<Amharic word>", "ao": "<Oromo equivalent>" }. The app will show the word in the learner's TARGET language, and the options in the learner's NATIVE language. The options are also parallel pairs. The correct option is the correct translation of the prompt word. Example:
  prompt: { "am": "ሰላም", "ao": "Nagaa" }, options: [{ "am": "አመሰግናለሁ", "ao": "Galatoomi" }, { "am": "ሰላም", "ao": "Nagaa" }, { "am": "ደህና ሁን", "ao": "Nagaatti" }], correctIndex: 1
  → Amharic native sees "Nagaa" and picks "ሰላም" ✓. Oromo native sees "ሰላም" and picks "Nagaa" ✓.
  DO NOT write prompts like "What does X mean?" — just put the raw word/phrase.

- For MATCHING: pairs must use "left" for Amharic words and "right" for their Oromo translations. Example:
  pairs: [{ "left": "ሰላም", "right": "Nagaa" }, { "left": "አመሰግናለሁ", "right": "Galatoomi" }]

- For SCRAMBLE: "prompt" is a translation hint in both languages. "scrambled" and "answer" must BOTH be objects: { "am": [...], "ao": [...] } and { "am": "...", "ao": "..." }. The app shows the target language version.
  scrambled: { "am": ["ነህ?", "እንዴት"], "ao": ["jirta?", "Akkam"] }, answer: { "am": "እንዴት ነህ?", "ao": "Akkam jirta?" }

- For CLOZE: Provide a full sentence with one vocabulary word missing. Split the sentence into textBeforeBlank and textAfterBlank. Do NOT put 'answer here' or '...' in the text. "options" is a parallel array, and "correctAnswer" is the correct option.
  textBeforeBlank: { "am": "First part ", "ao": "First part " }, textAfterBlank: { "am": " second part.", "ao": " second part." }, options: [{ "am": "wrong", "ao": "wrong" }, { "am": "correct", "ao": "correct" }], correctAnswer: { "am": "correct", "ao": "correct" }

ABSOLUTELY NO ENGLISH anywhere in the output. No English words, no English translations, no English labels. Every single string must be in Amharic or Afan Oromo only. Speaker names must be Ethiopian/Oromo names (e.g. አማኑኤል, ፋጡማ, Leemmaa, Chaaltuu).`;

    case "DIALOGUE":
      return `You are a bilingual dialogue writer for Amharic and Afan Oromo.
Generate an interactive dialogue for the topic "${topicTitle}" at ${level} level.${exclusionPrompt}

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
      "question": { "am": "ምን ማለት አለብህ?", "ao": "Maal jechuu qabda?" },
      "options": [
        { "am": "ምርጫ 1", "ao": "Filannoo 1" },
        { "am": "ምርጫ 2", "ao": "Filannoo 2" },
        { "am": "ምርጫ 3", "ao": "Filannoo 3" }
      ],
      "correctAnswerIndex": 0
    }
  ]
}
Generate 6-8 dialogue lines. Make 2-3 of them interactive with questions. Use realistic conversational language.
ABSOLUTELY NO ENGLISH anywhere. Character names must be Ethiopian/Oromo names. Every string must be in Amharic or Afan Oromo only.`;

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
}
ABSOLUTELY NO ENGLISH anywhere. Every string must be in Amharic or Afan Oromo only.`;

    case "SPEAKING":
      return `You are a bilingual pronunciation coach for Amharic and Afan Oromo.
Generate a speaking exercise for the topic "${topicTitle}" at ${level} level.

Return ONLY valid JSON matching this exact structure:
{
  "prompt": { "am": "Instruction telling user what to say in Amharic", "ao": "Same in Oromo" },
  "expectedText": { "am": "The exact phrase to pronounce in Amharic", "ao": "The exact phrase in Oromo" }
}
ABSOLUTELY NO ENGLISH anywhere. Every string must be in Amharic or Afan Oromo only.`;

    case "QUESTION":
      return `You are a bilingual quiz question designer for Amharic and Afan Oromo.
Generate 3 quiz questions for the topic "${topicTitle}" at ${level} level.${exclusionPrompt}

Return ONLY a valid JSON array. Each question must match ONE of these types:

CRITICAL: These questions serve BOTH Amharic-native and Oromo-native learners simultaneously.
The app shows the prompt in the learner's TARGET language and options in their NATIVE language.
So every field must contain PARALLEL TRANSLATIONS that work in both directions.

Type "MULTIPLE_CHOICE":
{ "type": "MULTIPLE_CHOICE", "intendedFor": "BOTH", "content": { "prompt": { "am": "<Amharic word>", "ao": "<Oromo equivalent>" }, "options": [{ "am": "...", "ao": "..." }], "correctIndex": 0 } }
The "prompt" is a single vocabulary word/phrase as a parallel pair. NOT a sentence like "What does X mean?". Just the raw word.
The correct option at correctIndex must be the exact translation pair of the prompt word.

Type "MATCHING":
{ "type": "MATCHING", "intendedFor": "BOTH", "content": { "prompt": { "am": "ትክክለኛውን ጥንድ አዛምድ", "ao": "Walsimsiisi sirrii filadhu" }, "pairs": [{ "left": "<Amharic word>", "right": "<Oromo translation>" }] } }
"left" is ALWAYS an Amharic word, "right" is ALWAYS its Oromo translation.

Type "SCRAMBLE":
{ "type": "SCRAMBLE", "intendedFor": "BOTH", "content": { "prompt": { "am": "<translation hint in Amharic>", "ao": "<translation hint in Oromo>" }, "scrambled": { "am": ["word1", "word2"], "ao": ["word1", "word2"] }, "answer": { "am": "correct Amharic sentence", "ao": "correct Oromo sentence" } } }
scrambled and answer MUST be objects with both "am" and "ao" versions.

Type "CLOZE":
{ "type": "CLOZE", "intendedFor": "BOTH", "content": { "prompt": { "am": "ባዶ ቦታውን ይሙሉ", "ao": "Bakka duwwaa guuti" }, "textBeforeBlank": { "am": "First part of sentence ", "ao": "First part of sentence " }, "textAfterBlank": { "am": " second part", "ao": " second part" }, "options": [{ "am": "wrong", "ao": "wrong" }, { "am": "correct", "ao": "correct" }], "correctAnswer": { "am": "correct", "ao": "correct" } } }
Provide a full sentence with one vocabulary word missing. Split the sentence into textBeforeBlank and textAfterBlank. Do NOT put 'answer here' or '...' in the text.

Mix the types. Generate exactly 3 questions.
ABSOLUTELY NO ENGLISH anywhere. Every string must be in Amharic or Afan Oromo only.`;

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
All text must be authentic natural language, not transliteration.
ABSOLUTELY NO ENGLISH anywhere. Every string must be in Amharic or Afan Oromo only.`;

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

    // Inject a random seed to force variety in the generated content and prevent duplicate output
    const seed = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
    const randomizedPrompt = prompt + `\n\n[System directive: Ensure absolute uniqueness for this generation cycle. Internal variation seed: ${seed}. Do NOT output this seed, just use it to randomize your vocabulary choices and sentence structures.]`;

    for (const modelName of modelsToTry) {
      const model = getModel(modelName);

      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          const result = await model.generateContent(randomizedPrompt);
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

    // Fetch existing vocabulary to avoid repetition
    const existingLessons = await Lesson.find({ topicId }).select("vocabulary.am").lean();
    const excludedWords = existingLessons
      .flatMap((l) => l.vocabulary?.map((v) => v.am) || [])
      .filter((word): word is string => Boolean(word));

    const normalizedType = type.toUpperCase();
    const prompt = buildPrompt(normalizedType, topic, level, excludedWords);
    return this.generateFromPrompt(prompt);
  }
}
