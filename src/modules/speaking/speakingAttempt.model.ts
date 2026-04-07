import mongoose from "mongoose";

const speakingAttemptSchema = new mongoose.Schema(
  {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    exerciseId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "SpeakingExercise", 
      required: true 
    },
    targetLanguage: { 
      type: String, 
      enum: ["am", "ao"], 
      required: true 
    },
    // What Gemini ACTUALLY heard the user say
    transcribedText: { 
      type: String, 
      required: true 
    },
    // Did they pass the evaluation?
    isCompleted: { 
      type: Boolean, 
      required: true 
    },
    // The AI's explanation of their pronunciation
    feedback: { 
      type: String 
    },
    // OPTIONAL: If you later decide to upload their audio to AWS S3 / Cloudinary
    userAudioUrl: { 
      type: String 
    }
  },
  { timestamps: true }
);

export const SpeakingAttempt = mongoose.model("SpeakingAttempt", speakingAttemptSchema);