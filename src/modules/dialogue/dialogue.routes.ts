import { Router } from "express";
import {
	createDialogue,
	deleteDialogue,
	getAllDialogues,
	getDialogueById,
	getDialoguesByTopic,
	toggleDialogueVerification,
	updateDialogue,
} from "./dialogue.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createDialogue);
router.get("/", getAllDialogues);
router.get("/topic/:topicId", getDialoguesByTopic);
router.get("/:id", getDialogueById);
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateDialogue);
router.patch(
	"/:id/verify",
	authenticate,
	checkRole(["EXPERT", "ADMIN"]),
	toggleDialogueVerification,
);
router.delete("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), deleteDialogue);

export default router;
