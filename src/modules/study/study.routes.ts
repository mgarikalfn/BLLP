import { Router } from "express";
import {
  reviewLesson,
  getDueLessons,
  startStudySession,
  getStudyStats,
  getWeakAreas
} from "./study.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/review", authenticate, reviewLesson);
router.get("/due", authenticate, getDueLessons);
router.get("/session", authenticate, startStudySession);
router.get("/stats", authenticate, getStudyStats);
router.get("/weak", authenticate, getWeakAreas);


export default router;