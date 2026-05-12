import { Router } from "express";
import { authenticate, checkRole } from "../../middleware/auth.middleware";
import { Role } from "../user/user.model";
import { createReport, getPendingReports, banUser, resolveReport, getModerationChatHistory } from "./report.controller";

const router = Router();

router.use(authenticate);

// User endpoint to submit a report
router.post("/", createReport);

// Moderation (Expert/Admin) endpoints
router.get("/pending", checkRole([Role.EXPERT, Role.ADMIN]), getPendingReports);
router.patch("/:reportId/resolve", checkRole([Role.EXPERT, Role.ADMIN]), resolveReport);
router.get("/conversations/:conversationId/messages", checkRole([Role.EXPERT, Role.ADMIN]), getModerationChatHistory);

// Admin specific (Legacy support or direct ban)
router.post("/ban-user", checkRole([Role.ADMIN]), banUser);

export default router;
