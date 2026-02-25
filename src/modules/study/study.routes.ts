import { Router } from "express";
import {
  reviewLesson,
  getDueLessons
} from "./study.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.post("/review", authenticate, reviewLesson);
router.get("/due", authenticate, getDueLessons);

export default router;