import { Router } from "express";
import { createTopic, getAllTopics } from "./topic.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createTopic);
router.get("/", getAllTopics);

export default router;