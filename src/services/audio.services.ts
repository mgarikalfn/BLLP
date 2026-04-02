import axios from "axios";
import fs from "fs";
import path from "path";

export class AudioService {
  /**
   * Generates audio from Addis AI using the official X-API-Key header format.
   */
  static async generateAndUpload(
    text: string, 
    language: "am" | "om"
  ): Promise<string | null> {
    try {
      const apiKey = process.env.ADDIS_AI_API_KEY; // Ensure this starts with 'sk_'
      
      if (!apiKey) {
        console.error("❌ ADDIS_AI_API_KEY is missing from .env");
        return null;
      }

      console.log(`\n⏳ Requesting Addis AI: "${text}"...`);

      const response = await axios.post(
        "https://api.addisassistant.com/api/v1/audio", 
        {
          text: text,
          language: language,
          voice_id: "female_1" // You can change this to "female_1" if available
        },
        {
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": apiKey // Official header format
          }
        }
      );

      // CRITICAL: The doc says the field is 'audio', not 'audio_base64'
      const base64Data = response.data.audio;
      
      if (!base64Data) {
        console.error("❌ API Success, but no 'audio' field found. Data received:", response.data);
        return null;
      }

      const buffer = Buffer.from(base64Data, "base64");

      // Set up the local path
      const uploadsDir = path.join(__dirname, "../../public/uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `audio_${Date.now()}.wav`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      
      console.log(`✅ Success! File saved: ${fileName}`);
      return `/uploads/${fileName}`;

    } catch (error: any) {
      console.error(`\n❌ Addis AI Error:`);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Body:`, error.response.data);
      } else {
        console.error(`   Message: ${error.message}`);
      }
      return null;
    }
  }
}