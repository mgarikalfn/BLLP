import { Request, Response } from "express";
import { Lesson } from "./lesson.model";
import { GeminiAudioService } from "../../services/audio.services";

// Helper to pause execution
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const audioService = new GeminiAudioService();

export const createLesson = async (req: Request, res: Response) => {
  try {
    const { topicId, order, title, vocabulary, quiz, isVerified } = req.body;

    // Generate audio for vocabulary and examples
    if (vocabulary && Array.isArray(vocabulary)) {
      for (const vocab of vocabulary) {
        if (!vocab.audioUrl) vocab.audioUrl = {};
        if (vocab.am && !vocab.audioUrl.am) {
          try {
            const amUrl = await audioService.generateLessonAudio(vocab.am, "amharic");
            if (amUrl) vocab.audioUrl.am = amUrl;
            await sleep(2000);
          } catch(e) { console.error("Error generating amharic vocab audio"); }
        }
        if (vocab.ao && !vocab.audioUrl.ao) {
          try {
            const aoUrl = await audioService.generateLessonAudio(vocab.ao, "oromo");
            if (aoUrl) vocab.audioUrl.ao = aoUrl;
            await sleep(2000);
          } catch(e) { console.error("Error generating oromo vocab audio"); }
        }
        
        if (vocab.example) {
          if (!vocab.example.audioUrl) vocab.example.audioUrl = {};
          if (vocab.example.am && !vocab.example.audioUrl.am) {
            try {
              const exAmUrl = await audioService.generateLessonAudio(vocab.example.am, "amharic");
              if (exAmUrl) vocab.example.audioUrl.am = exAmUrl;
              await sleep(2000);
            } catch(e) { console.error("Error generating amharic example audio"); }
          }
          if (vocab.example.ao && !vocab.example.audioUrl.ao) {
            try {
              const exAoUrl = await audioService.generateLessonAudio(vocab.example.ao, "oromo");
              if (exAoUrl) vocab.example.audioUrl.ao = exAoUrl;
              await sleep(2000);
            } catch(e) { console.error("Error generating oromo example audio"); }
          }
        }
      }
    }

    const lesson = await Lesson.create({
      topicId,
      order,
      title,
      vocabulary,
      quiz,
      isVerified // Optional: will default to false if not provided, based on your schema
    });

    return res.status(201).json(lesson);
  } catch (error: any) {
    // THIS IS THE MOST IMPORTANT LINE FOR DEBUGGING
    console.error("CRITICAL LESSON ERROR:", error);

    if (error.code === 11000) {
      return res.status(400).json({ 
        message: "Duplicate error: This lesson order already exists for this topic.",
        error: error.keyValue 
      });
    }

    return res.status(500).json({ 
      message: "Internal Server Error", 
      details: error.message 
    });
  }
};

export const getLessonsByTopic = async (req: Request, res: Response) => {
  try {
    const { topicId } = req.params;
    const { verified } = req.query;

    const filter: any = { topicId };

    if (verified === "true") {
      filter.isVerified = true;
    }

    const lessons = await Lesson.find(filter).sort({ order: 1 });

    res.json(lessons);
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    const updatedData = req.body;

    // Never override MongoDB specific keys manually to avoid VersionErrors
    delete updatedData._id;
    delete updatedData.__v;
    delete updatedData.createdAt;
    delete updatedData.updatedAt;

    Object.assign(lesson, updatedData);

    await lesson.save();

    return res.json(lesson);
  } catch (error: any) {
    console.error("CRITICAL LESSON UPDATE ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: "Duplicate lesson order", error: error.keyValue });
    }
    return res.status(500).json({ 
      message: "Server error", 
      details: error.message || error.toString() 
    });
  }
};

export const resumeLessonAudioGeneration = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson || !lesson.vocabulary || !Array.isArray(lesson.vocabulary)) {
      return res.status(404).json({ message: "Lesson or vocabulary not found" });
    }

    let generatedCount = 0;
    let attemptedCount = 0;

    // Loop through all vocabulary items
    for (let i = 0; i < lesson.vocabulary.length; i++) {
      const vocab: any = lesson.vocabulary[i];

      if (!vocab.audioUrl) vocab.audioUrl = {};
      if (vocab.example && !vocab.example.audioUrl) vocab.example.audioUrl = {};

      try {
        // --- 1. Amharic & Oromo Vocab Audio ---
        if (vocab.am && !vocab.audioUrl.am) {
          attemptedCount++;
          try {
            console.log(`Generating Amharic vocab audio for: ${vocab.am}`);
            vocab.audioUrl.am = await audioService.generateLessonAudio(vocab.am, "amharic");
            generatedCount++;
            lesson.markModified(`vocabulary`);
            await lesson.save();
            await sleep(3000); // ⏱️ Wait 3 seconds to avoid rate limits
          } catch (e: any) {
            console.error("Failed on am", e.message);
            if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
              console.log("⚠️ Hit API rate limit. Automatically sleeping for 35 seconds to cool down...");
              await sleep(35000);
            }
          }
        }
        
        if (vocab.ao && !vocab.audioUrl.ao) {
          attemptedCount++;
          try {
            console.log(`Generating Oromo vocab audio for: ${vocab.ao}`);
            vocab.audioUrl.ao = await audioService.generateLessonAudio(vocab.ao, "oromo");
            generatedCount++;
            lesson.markModified(`vocabulary`);
            await lesson.save();
            await sleep(3000); // ⏱️ Wait 3 seconds
          } catch (e: any) {
            console.error("Failed on ao", e.message);
            if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
              console.log("⚠️ Hit API rate limit. Automatically sleeping for 35 seconds to cool down...");
              await sleep(35000);
            }
          }
        }

        // --- 2. Example Sentence Audio ---
        if (vocab.example) {
          if (vocab.example.am && !vocab.example.audioUrl.am) {
            attemptedCount++;
            try {
              console.log(`Generating Amharic example audio for: ${vocab.example.am}`);
              vocab.example.audioUrl.am = await audioService.generateLessonAudio(vocab.example.am, "amharic");
              generatedCount++;
              lesson.markModified(`vocabulary`);
              await lesson.save();
              await sleep(3000); // ⏱️ Wait 3 seconds
            } catch (e: any) {
              console.error("Failed on example am", e.message);
              if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
                console.log("⚠️ Hit API rate limit. Automatically sleeping for 35 seconds to cool down...");
                await sleep(35000);
              }
            }
          }
          
          if (vocab.example.ao && !vocab.example.audioUrl.ao) {
            attemptedCount++;
            try {
              console.log(`Generating Oromo example audio for: ${vocab.example.ao}`);
              vocab.example.audioUrl.ao = await audioService.generateLessonAudio(vocab.example.ao, "oromo");
              generatedCount++;
              lesson.markModified(`vocabulary`);
              await lesson.save();
              await sleep(3000); // ⏱️ Wait 3 seconds
            } catch (e: any) {
              console.error("Failed on example ao", e.message);
              if (e.message?.includes("429") || e.message?.includes("Too Many Requests")) {
                console.log("⚠️ Hit API rate limit. Automatically sleeping for 35 seconds to cool down...");
                await sleep(35000);
              }
            }
          }
        }
      } catch (vocabError: any) {
        console.error(`⚠️ API Error structure for vocab ${i}:`, vocabError.message);
      }
    }

    if (generatedCount === 0 && attemptedCount > 0) {
      return res.status(502).json({ message: "API Failure", details: "API responded but no audio data was returned or limits reached." });
    }

    if (attemptedCount === 0) {
       return res.json({ success: true, message: "No new audio needed. Lesson is fully generated.", data: lesson });
    }

    return res.json({
      success: true,
      message: `Successfully resumed & generated ${generatedCount} new audio files.`,
      data: lesson
    });

  } catch (error: any) {
    console.error("CRITICAL ERROR:", error);
    return res.status(500).json({ message: "Server error", details: error.message });
  }
};

export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    await lesson.deleteOne();

    res.json({ message: "Lesson deleted" });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};

export const toggleVerification = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    lesson.isVerified = !lesson.isVerified;
    await lesson.save();

    res.json({ message: "Verification status updated", isVerified: lesson.isVerified });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
};
