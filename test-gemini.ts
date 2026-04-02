import { GoogleGenerativeAI } from "@google/generative-ai";import fs from "fs";
import path from "path";

// Initialize the client. Ensure your .env has GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY );

async function testGeminiAudio() {
  console.log("🚀 Starting Gemini Audio generation test...");

  // We use the Gemini 2.5 TTS preview which supports audio output
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-tts" });

  // 1. The Prompt: This is where Gemini shines over traditional TTS.
  // You can give it acting directions, pacing, and pronunciation hints.
  const prompt = `
    Please say the following Afan Oromo phrase clearly and slowly for a language learning student.
    Ensure the double 't' in 'Nagaatti' is pronounced clearly, and the implosive 'dh' in 'dhiifama' is distinct.
    
    Phrase: "Nagaatti, galatoomi dhiifama."
  `;

  try {
    console.log("⏳ Sending request to Gemini...");
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      // Specify that we want AUDIO, not text
      generationConfig: { responseModalities: ["AUDIO"] } as any
    });
    
    // 2. Extract the audio from the response
    const response = await result.response;
    
    // Gemini returns multimodal parts. We need to find the one containing audio data.
    const audioPart = response.candidates?.[0]?.content?.parts?.find(
      (part) => part.inlineData && part.inlineData.mimeType.startsWith("audio/")
    );

    if (!audioPart || !audioPart.inlineData) {
      console.error("❌ No audio data found in the response. Check the prompt or API key.");
      return;
    }

    // 4. Decode the Base64 data (returned encoded raw PCM from Gemini)
    const base64Data = audioPart.inlineData.data;
    const pcmBuffer = Buffer.from(base64Data, "base64");

    // 5. Gemini returns raw PCM audio (24kHz, 16-bit mono). 
    //    We need to slap a WAV header on it so media players know how to play it!
    const sampleRate = 24000;
    const wavBuffer = Buffer.alloc(44 + pcmBuffer.length);
    wavBuffer.write('RIFF', 0);
    wavBuffer.writeUInt32LE(36 + pcmBuffer.length, 4);
    wavBuffer.write('WAVE', 8);
    wavBuffer.write('fmt ', 12);
    wavBuffer.writeUInt32LE(16, 16);
    wavBuffer.writeUInt16LE(1, 20); // PCM
    wavBuffer.writeUInt16LE(1, 22); // 1 channel
    wavBuffer.writeUInt32LE(sampleRate, 24);
    wavBuffer.writeUInt32LE(sampleRate * 2, 28);
    wavBuffer.writeUInt16LE(2, 32);
    wavBuffer.writeUInt16LE(16, 34);
    wavBuffer.write('data', 36);
    wavBuffer.writeUInt32LE(pcmBuffer.length, 40);
    pcmBuffer.copy(wavBuffer, 44);

    // 6. Save to a local test folder
    const outputDir = path.join(__dirname, "gemini-tests");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `gemini_oromo_${Date.now()}.wav`;
    const filePath = path.join(outputDir, fileName);

    fs.writeFileSync(filePath, wavBuffer);
    console.log(`✅ Success! Playable audio saved to: ${filePath}`);

  } catch (error: any) {
    console.error("\n❌ Gemini API Error:");
    console.error(error.message || error);
  }
}

testGeminiAudio();