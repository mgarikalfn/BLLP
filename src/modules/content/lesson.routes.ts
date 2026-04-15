import { Router } from "express";
import { createLesson, deleteLesson, getLessonById, resumeLessonAudioGeneration, getLessonsByTopic, toggleVerification, updateLesson } from "./lesson.controller";
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

// Assuming this is in your lesson.routes.ts file
router.put("/:id/generate-audio", resumeLessonAudioGeneration);
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
router.get("/:id", getLessonById);
router.get("/topic/:topicId", getLessonsByTopic);

export default router;