import { GoogleGenerativeAI } from "@google/generative-ai";

export class SpeakingEvaluationService {
  private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
  private static model = this.genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  public static async evaluateSpeaking(
    audioBuffer: Buffer,
    mimeType: string,
    expectedText: string,
    targetLanguage: "am" | "ao"
  ) {
    const languageName = targetLanguage === "am" ? "Amharic" : "Afan Oromo";
    const feedbackLanguage = targetLanguage === "am" ? "Amharic" : "Afan Oromo";

    const prompt = `You are an expert ${languageName} language teacher.
Listen to the provided audio clip and compare it to the expected text.
Expected Text: "${expectedText}"

Evaluate pronunciation and clarity.
Return ONLY a valid JSON object with no markdown, no code block fences, and no extra keys.
The feedback must be written only in ${feedbackLanguage}.
Use exactly this schema:
{
  "isCorrect": boolean,
  "transcribedText": string,
  "feedback": string
}`;

    const audioPart = {
      inlineData: {
        data: audioBuffer.toString("base64"),
        mimeType: mimeType,
      },
    };

    try {
      const result = await this.model.generateContent([prompt, audioPart]);
      const responseText = result.response.text();
      
      return JSON.parse(responseText);
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Failed to evaluate speaking audio via GenAI.");
    }
  }
}
