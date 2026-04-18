import { Schema, model, Types } from "mongoose";

export interface IProgress {
  userId: Types.ObjectId;
  
  // Generic reference to the content being tracked
  contentId: Types.ObjectId; 
  contentType: 'LESSON' | 'DIALOGUE' | 'WRITING' | 'SPEAKING' | 'TOPIC_TEST';

  // Spaced Repetition (Mainly used for Lessons/Vocab)
  repetition: number;
  interval: number;
  easeFactor: number;

  nextReview: Date;
  lastReviewed?: Date;
  
  // For tests/exercises, you might want to track the best score
  bestScore?: number; 
}

const progressSchema = new Schema<IProgress>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    contentId: { type: Schema.Types.ObjectId, required: true },
    contentType: { 
      type: String, 
      enum: ['LESSON', 'DIALOGUE', 'WRITING', 'SPEAKING', 'TOPIC_TEST'], 
      required: true 
    },

    repetition: { type: Number, default: 0 },
    interval: { type: Number, default: 0 },
    easeFactor: { type: Number, default: 2.5 },

    nextReview: { type: Date, default: Date.now },
    lastReviewed: { type: Date },
    bestScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// CRITICAL: Ensure a user only has one progress record per piece of content
progressSchema.index({ userId: 1, contentId: 1 }, { unique: true });

export const Progress = model<IProgress>("Progress", progressSchema);