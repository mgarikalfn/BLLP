import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import { ENV } from "./config/env";
import topicRoutes from "./modules/content/topic.routes";
import lessonRoutes from "./modules/content/lesson.routes";

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

app.use("/api/topics", topicRoutes);
app.use("/api/lessons", lessonRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

app.listen(ENV.PORT, () => {
  console.log(`Server running on port ${ENV.PORT}`);
});
