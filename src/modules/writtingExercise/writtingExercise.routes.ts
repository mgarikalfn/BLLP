// writing.routes.ts
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { createWritingExercise, submitWritingExercise } from "./writingExercise.controller";

const router = Router();

// User Route: Submit an answer
router.post("/submit", authenticate, submitWritingExercise);

// Admin Route: Insert a new exercise
router.post("/create", authenticate, createWritingExercise);

export default router;