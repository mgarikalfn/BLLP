import stringSimilarity from "string-similarity";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export class WritingEvaluationService {
  /**
   * Cleans text for comparison. 
   * Specifically handles Amharic punctuation and Oromo special characters.
   */
  private static normalize(text: string): string {
    return text
      .toLowerCase()
      // Remove English punctuation but keep Oromo apostrophes (e.g., danda'a)
      .replace(/[.,;!?]/g, "")
      // Remove Amharic specific punctuation: ። (Arat Netib), ፣ (Netela Cherez), etc.
      .replace(/[።፡፣፤፥፦]/g, "")
      .replace(/\s+/g, " ") // Collapse multiple spaces
      .trim();
  }

  /**
   * Deterministic Evaluation for Translations
   */
  static evaluateTranslation(submitted: string, expected: string) {
    const cleanSub = this.normalize(submitted);
    const cleanExp = this.normalize(expected);

    // Calculate similarity (0 to 1)
    const score = stringSimilarity.compareTwoStrings(cleanSub, cleanExp);

    if (score === 1) {
      return { isCorrect: true, status: "PERFECT", feedback: "Excellent! Perfect translation." };
    } else if (score >= 0.8) {
      return { isCorrect: true, status: "TYPO", feedback: "Correct, but check your spelling." };
    } else {
      return { isCorrect: false, status: "INCORRECT", feedback: "Not quite. Look at the sample answer." };
    }
  }

  /**
   * AI-based Evaluation for Open Prompts
   */
 static async evaluateOpenPrompt(
  submitted: string, 
  targetLang: "am" | "ao", 
  nativeLang: "am" | "ao" = "am"
) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: { 
        responseMimeType: "application/json",
        temperature: 0.1 // Lower temperature = more consistent, "stricter" grading
    } 
  });

  const targetName = targetLang === "am" ? "Amharic" : "Afan Oromo";
  const nativeName = nativeLang === "am" ? "Amharic" : "Afan Oromo";
  
  const systemPrompt = `
    ROLE: You are an elite, strict ${targetName} language professor.
    TASK: Evaluate the following student submission: "${submitted}"
    
    STRICT RULES:
    1. GRAMMAR: The sentence must use correct ${targetName} syntax and verb conjugation.
    2. NO NOISE: If the text contains English words (e.g., "uh", "no", "yes", "ok") or nonsensical symbols, isCorrect MUST be false.
    3. COMPLETENESS: The submission must be a complete, logical thought.
    4. FEEDBACK LANGUAGE: You MUST write your feedback in ${nativeName} ONLY. Do not use English in the feedback string.
    5. TONE: Be encouraging but precise. If there is a mistake, explain why in ${nativeName}.

    RETURN JSON ONLY:
    {
      "isCorrect": boolean,
      "feedback": "Your explanation in ${nativeName} goes here."
    }
  `;

  try {
    const result = await model.generateContent(systemPrompt);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error("AI Service Error:", error);
    return { 
      isCorrect: false, 
      feedback: nativeLang === "am" ? "ይቅርታ፣ ግምገማውን ማካሄድ አልተቻለም።" : "Koree, madda kanaan qorannoo gochuun hin danda'amne." 
    };
  }
}
}