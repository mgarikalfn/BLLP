import { Document, model, Schema, Types } from "mongoose";


export interface IQuestion extends Document{
    topicId:Types.ObjectId;
    lessonId?:Types.ObjectId;

    intendedFor:'LESSON' | 'TEST'| 'BOTH';
    type:'MULTIPLE_CHOICE'| 'MATCHING' | 'SCRAMBLE' | 'CLOZE';

    // Polymorphic Content (Shape changes based on 'type')
  content: any; 
  
  isVerified: boolean;
}

const questionSchema = new Schema<IQuestion>(
  {
    topicId: { type: Schema.Types.ObjectId, ref: "Topic", required: true, index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    
    intendedFor: { 
      type: String, 
      enum: ['LESSON', 'TEST', 'BOTH'], 
      required: true 
    },
    type: { 
      type: String, 
      enum: ['MULTIPLE_CHOICE', 'MATCHING', 'SCRAMBLE', 'CLOZE'], 
      required: true 
    },
    
    // Schema.Types.Mixed allows us to store different JSON shapes here
    content: { type: Schema.Types.Mixed, required: true },
    
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Question = model<IQuestion>("Question", questionSchema);