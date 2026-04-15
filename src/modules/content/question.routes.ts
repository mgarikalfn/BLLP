import { Router } from "express";
import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  getQuestions,
  toggleQuestionVerification,
  updateQuestion,
} from "./question.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.use(authenticate, checkRole(["ADMIN"]));

router.post("/", createQuestion);
router.get("/", getQuestions);
router.get("/:id", getQuestionById);
router.put("/:id", updateQuestion);
router.delete("/:id", deleteQuestion);
router.patch("/:id/verify", toggleQuestionVerification);

export default router;
