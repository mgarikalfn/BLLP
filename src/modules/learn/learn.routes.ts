import { Router } from "express";
import {
  getTopicLessons,
  completeLesson,
} from "./learn.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/topic/:topicId", authenticate, getTopicLessons);
router.post("/complete", authenticate, completeLesson);

export default router;