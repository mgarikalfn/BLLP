import { Router } from "express";
import {
  createTopic,
  deleteTopic,
  getAllTopics,
  updateTopic,
} from "./topic.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";
import { getTopicWorkspace } from "../workspace/workspace.controller";

const router = Router();

router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createTopic);
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateTopic);
router.get("/:id/workspace",authenticate,getTopicWorkspace);
router.delete(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  deleteTopic,
);
router.get("/", getAllTopics);

export default router;
