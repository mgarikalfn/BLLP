import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";
import profileRoutes from "./modules/user/profile.routes";
import { ENV } from "./config/env";
import path from "path";
import topicRoutes from "./modules/content/topic.routes";
import lessonRoutes from "./modules/content/lesson.routes";
import questionRoutes from "./modules/content/question.routes";
import studyRoutes from "./modules/study/study.routes";
import learnRoutes from "./modules/learn/learn.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import leaderboardRoutes from "./modules/leaderboard/leaderboard.routes";
import workspaceRoutes from "./modules/workspace/workspace.routes";
import dialogueRoutes from "./modules/dialogue/dialogue.routes";
import writingRoutes from "./modules/writtingExercise/writtingExercise.routes";
import speakingRoutes from "./modules/speaking/speaking.routes";
import aiRoutes from "./modules/ai/ai.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import economyRoutes from "./modules/economy/economy.routes";
import chatRoutes from "./modules/chat/chat.routes";
import reportRoutes from "./modules/chat/report.routes";
import { startNotificationJobs } from "./cron/notification.jobs";
import { startQuestJobs } from "./cron/quest.jobs";
import { v2 as cloudinary } from 'cloudinary';
import swaggerJsdoc from "swagger-jsdoc";
import  swaggerUi from 'swagger-ui-express';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Ensures all generated URLs use https
});


connectDB();

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*", // Adjust this in production
    methods: ["GET", "POST"]
  }
});

// Setup Socket.IO for chat
io.on("connection", (socket) => {
  console.log("New socket connection:", socket.id);

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on("send_message", async (data) => {
    const { conversationId, senderId, text } = data;
    try {
      // Lazy load to avoid circular dependency
      const { Message, Conversation } = require("./modules/chat/chat.models");
      
      const newMessage = await Message.create({
        conversationId,
        senderId,
        text
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessageAt: new Date()
      });

      // Broadcast to everyone in the room (including sender to confirm)
      io.to(conversationId).emit("receive_message", newMessage);
    } catch (error) {
      console.error("Socket send_message error:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);
  });
});


// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'My Express API',
      version: '1.0.0',
      description: 'A simple Express API with Swagger documentation',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
      },
    ],
  },
  // Path to the API docs (where you'll write your swagger comments)
  apis: [
    "./src/modules/**/*.routes.ts",
    "./src/modules/**/*.controller.ts",
    "./dist/modules/**/*.routes.js",
    "./dist/modules/**/*.controller.js",
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// CSS/UI Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
app.use(cors());
app.use(express.json());

// Serve the uploads directory statically so you can access it via URL
app.use("/uploads", express.static(path.join(__dirname, "../public/uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);

app.use("/api/topics", topicRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/study", studyRoutes);
app.use("/api/learn", learnRoutes);
app.use("/api/dialogues", dialogueRoutes);
app.use("/api/workspace",workspaceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/writing",writingRoutes);
app.use("/api/speaking", speakingRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/economy", economyRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/reports", reportRoutes);

app.get("/", (req, res) => {
  res.send("API Running");
});

server.listen(ENV.PORT, () => {
  startNotificationJobs();
  startQuestJobs();
  console.log(`Server running on port ${ENV.PORT}`);
});
