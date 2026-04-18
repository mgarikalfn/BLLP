import mongoose from "mongoose";
import { Progress } from "../modules/study/progress.model";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URL as string);
    await Progress.syncIndexes();
    console.log("MongoDB connected");
  } catch (error) {
    console.error("DB connection failed:", error);
    process.exit(1);
  }
};
  