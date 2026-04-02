import axios from "axios";
import fs from "fs";
import path from "path";

export class AudioService {
  static async generateAndUpload(text: string, language: "am" | "om"): Promise<string | null> {
    try {
      console.log(`\n⏳ Calling Addis AI API for text: "${text}" | language: ${language}`);
      
      const apiKey 
      if (!apiKey) {
        console.error("❌ ADDIS_AI_API_KEY is not defined!");
        return null;
      }

      const response = await axios.post(
        "https://api.addisassistant.com/api/v1/audio", 
        {
          text: text,
          language: language
        },
        {
          headers: {
            "x-api-key": apiKey,
            "Content-Type": "application/json"
          }
        }
      );

      const base64Audio = response.data.audio;
      
      if (!base64Audio) {
         console.error("❌ API Request succeeded, but 'audio' was missing.");
         return null;
      }

      const buffer = Buffer.from(base64Audio, "base64");

      // Save locally to the root directory for this quick test
      const uploadsDir = path.join(__dirname, "test-uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const fileName = `test_audio_${Date.now()}.wav`;
      const filePath = path.join(uploadsDir, fileName);

      fs.writeFileSync(filePath, buffer);
      
      console.log(`✅ Audio saved successfully at: ${filePath}`);
      return filePath;
      
    } catch (error: any) {
      console.error(`\n❌ API Error:`);
      if (error.response) {
        console.error("   Status:", error.response.status);
        console.error("   Message:", JSON.stringify(error.response.data, null, 2)); 
      } else {
        console.error(`   System Error:`, error.message);
      }
      return null;
    }
  }
}

// ==========================================
// TEST EXECUTOR
// ==========================================
async function runTest() {
  console.log("🚀 Starting isolated Addis AI test...");
  
  // A simple Amharic test phrase: "Hello, this is a test."
  const testPhrase = "ሰላም፣ ይህ የድምጽ ሙከራ ነው።"; 
  
  await AudioService.generateAndUpload(testPhrase, "am");
}

runTest();