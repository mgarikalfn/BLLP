import { GoogleGenerativeAI } from "@google/generative-ai";
import { Storage, Bucket } from "@google-cloud/storage";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export class GeminiAudioService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private storage: Storage;
  private bucket: Bucket;

  constructor() {
    const apiKey = (process.env.GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("[GeminiAudioService] Missing GEMINI_API_KEY in environment variables.");
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });
    
    // Initialize Google Cloud Storage
    const bucketName = process.env.GCS_BUCKET_NAME || "";
    if (!bucketName) {
      throw new Error("[GeminiAudioService] Missing GCS_BUCKET_NAME in environment variables.");
    }

    // Storage automatically uses GOOGLE_APPLICATION_CREDENTIALS if present.
    // On Cloud Run, it uses the service's identity automatically.
    const keyPath = path.join(process.cwd(), "gcp-service-account.json");
    this.storage = fs.existsSync(keyPath) 
      ? new Storage({ keyFilename: keyPath })
      : new Storage();
      
    this.bucket = this.storage.bucket(bucketName);
  }
  
  private getFileHash(text: string, language: string): string {
    return crypto.createHash("md5").update(`${language}_${text}`).digest("hex");
  }

  async generateLessonAudio(text: string, language: 'amharic' | 'oromo'): Promise<string> {
    try {
      const hash = this.getFileHash(text, language);
      const fileName = `vocabulary/${language}_${hash}.wav`;
      const file = this.bucket.file(fileName);

      // Check if file already exists in GCS
      const [exists] = await file.exists();
      if (exists) {
        console.log(`[GeminiAudioService] Audio already exists for "${text.slice(0, 20)}...", reusing ${fileName}`);
        return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;
      }

      console.log(`[GeminiAudioService] Generating new audio for "${text.slice(0, 20)}..."`);
      const pronunciationHints = language === 'oromo' 
        ? "Ensure the double consonants like 'tt' and the implosive 'dh' are distinct and clear." 
        : "Ensure the Ge'ez glottal stops and rhythm are natural.";

      const prompt = `Please say the following ${language} phrase clearly for a language learning app. ${pronunciationHints} Phrase: "${text}"`;

      const result = await this.model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 8192,
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
      
      // Upload to Google Cloud Storage
      await file.save(wavBuffer, {
        metadata: {
          contentType: 'audio/wav',
          cacheControl: 'public, max-age=31536000', // Cache for 1 year
        },
      });

      console.log(`[GeminiAudioService] Successfully uploaded ${fileName} to GCS bucket ${this.bucket.name}`);

      // Return the public Google Cloud Storage URL
      return `https://storage.googleapis.com/${this.bucket.name}/${fileName}`;

    } catch (error: any) {
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