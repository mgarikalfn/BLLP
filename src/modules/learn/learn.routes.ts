import { Router } from "express";
import {
  getTopicLessons,
  completeLesson,
  getLessonsById,
} from "./learn.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/topic/:topicId", authenticate, getTopicLessons);
router.post("/complete", authenticate, completeLesson);
router.get("/lessons/:id",authenticate,getLessonsById);

export default router;