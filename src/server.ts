import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import { ENV } from "./config/env";
import topicRoutes from "./modules/content/topic.routes";
import lessonRoutes from "./modules/content/lesson.routes";
import studyRoutes from "./modules/study/study.routes";
import learnRoutes from "./modules/learn/learn.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/topics", topicRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/learn", learnRoutes);
app.use("/api/workspace",workspaceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);


app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
