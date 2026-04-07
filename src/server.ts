import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import { ENV } from "./config/env";
import path from "path";
import topicRoutes from "./modules/content/topic.routes";
import lessonRoutes from "./modules/content/lesson.routes";
import studyRoutes from "./modules/study/study.routes";
import learnRoutes from "./modules/learn/learn.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
import dialogueRoutes from "./modules/dialogue/dialogue.routes";
import writingRoutes from "./modules/writtingExercise/writtingExercise.routes";
import speakingRoutes from "./modules/speaking/speaking.routes";
import { v2 as cloudinary } from 'cloudinary';


dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Ensures all generated URLs use https
});


connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// Serve the uploads directory statically so you can access it via URL
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/topics", topicRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/learn", learnRoutes);
app.use("/api/dialogues", dialogueRoutes);
app.use("/api/workspace",workspaceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/writing",writingRoutes);
app.use("/api/speaking", speakingRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
