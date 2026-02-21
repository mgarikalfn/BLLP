import { Router } from "express";
import { createLesson, getLessonsByTopic } from "./lesson.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  createLesson
);

router.get("/topic/:topicId", getLessonsByTopic);

export default router;