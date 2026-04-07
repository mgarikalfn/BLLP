import mongoose from "mongoose";

const speakingExerciseSchema = new mongoose.Schema(
  {
    topicId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Topic", 
      required: true 
    },
    level: { 
      type: String, 
      enum: ["BEGINNER", "INTERMEDIATE", "ADVANCED"], 
      default: "BEGINNER" 
    },
    // The instruction given to the user
    prompt: {
      am: { type: String, required: true }, // e.g., "ይህን ያንብቡ" (Read this)
      ao: { type: String, required: true }, // e.g., "Kana dubbisi"
    },
    // The exact text they are supposed to say
    expectedText: {
      am: { type: String, required: true },
      ao: { type: String, required: true },
    },
    // OPTIONAL: If you ever want to add a "Listen to Native Speaker" button
    referenceAudioUrl: {
      am: { type: String },
      ao: { type: String },
    },
    isVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export const SpeakingExercise = mongoose.model("SpeakingExercise", speakingExerciseSchema);