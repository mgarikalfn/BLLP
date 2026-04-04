import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

export class GeminiAudioService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private uploadDir: string;

  constructor() {
    const apiKey =  "AIzaSyCU8UBfM-YqqywQS8tHjWogFDDpd1HbK9Q" 
    //"AIzaSyDYW9kxlAT-STi1duR6cU_TLsJI4S8rDDg";
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });
    
    // FIX: Match the actual return path by adding "vocabulary" to the directory creation
    this.uploadDir = path.join(process.cwd(), "public", "uploads", "vocabulary");
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async generateLessonAudio(text: string, language: 'amharic' | 'oromo'): Promise<string> {
    try {
      const pronunciationHints = language === 'oromo' 
        ? "Ensure the double consonants like 'tt' and the implosive 'dh' are distinct and clear." 
        : "Ensure the Ge'ez glottal stops and rhythm are natural.";

      const prompt = `Please say the following ${language} phrase clearly for a language learning app. ${pronunciationHints} Phrase: "${text}"`;

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Aoede" } } }
        } as any
      });

      const response = await result.response;
      const audioPart = response.candidates?.[0]?.content?.parts?.find(
        (part: any) => part.inlineData && part.inlineData.mimeType.startsWith("audio/")
      );

      if (!audioPart?.inlineData) throw new Error("API responded but no audio data was returned.");

      const pcmBuffer = Buffer.from(audioPart.inlineData.data, "base64");
      const wavBuffer = this.addWavHeader(pcmBuffer, 24000); 

      const fileName = `${language}_${Date.now()}.wav`;
      const filePath = path.join(this.uploadDir, fileName);
      fs.writeFileSync(filePath, wavBuffer);

      return `/uploads/vocabulary/${fileName}`;

    } catch (error: any) {
      // FIX: Throw the error so the controller knows it failed!
      console.error(`❌ [GeminiAudioService] Error:`, error.message);
      throw error; 
    }
  }

  private addWavHeader(pcmBuffer: Buffer, sampleRate: number): Buffer {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + pcmBuffer.length, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(sampleRate * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(pcmBuffer.length, 40);
    return Buffer.concat([header, pcmBuffer]);
  }
}