import { Router } from "express";
import { backfillLessonAudio, createLesson, deleteLesson, getLessonsByTopic, toggleVerification, updateLesson } from "./lesson.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.post(
  "/",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  createLesson
);
router.put(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  updateLesson
);

router.delete(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  deleteLesson
);

router.patch(
  "/:id/verify",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  toggleVerification
);
router.get("/topic/:topicId", getLessonsByTopic);
router.post("/:lessonId/generate-audio", backfillLessonAudio);

export default router;