import { Router } from "express";
import multer from "multer";
import {
	createSpeakingExercise,
	deleteSpeakingExercise,
	getAllSpeakingExercises,
	getSpeakingExerciseById,
	submitSpeakingExercise,
	updateSpeakingExercise,
} from "./speaking.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

// Setup multer with memory storage so files are kept in memory as Buffers
const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

// Speaking exercise CRUD
router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createSpeakingExercise);
router.post("/create", authenticate, checkRole(["EXPERT", "ADMIN"]), createSpeakingExercise);
router.get("/", getAllSpeakingExercises);
router.get("/:id", getSpeakingExerciseById);
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateSpeakingExercise);
router.delete("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), deleteSpeakingExercise);

// Route: Submit speaking audio for evaluation
// Accepts a multipart/form-data request with an 'audio' file field and text fields
router.post("/submit", authenticate, upload.single("audio"), submitSpeakingExercise);

export default router;
