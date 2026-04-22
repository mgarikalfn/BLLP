import { Router } from "express";
import { authenticate, checkRole } from "../../middleware/auth.middleware";
import { Role } from "../user/user.model";
import { createReport, getPendingReports, banUser, dismissReport } from "./report.controller";

const router = Router();

router.use(authenticate);

// User endponit to submit a report
router.post("/", createReport);

// Admin endpoints
router.get("/pending", checkRole([Role.ADMIN]), getPendingReports);
router.post("/ban-user", checkRole([Role.ADMIN]), banUser);
router.patch("/:reportId/dismiss", checkRole([Role.ADMIN]), dismissReport);

export default router;
