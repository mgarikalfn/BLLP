import { Router } from "express";
import {
  createTopic,
  deleteTopic,
  getAllTopics,
  updateTopic,
} from "./topic.controller";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.post("/", authenticate, checkRole(["EXPERT", "ADMIN"]), createTopic);
router.put("/:id", authenticate, checkRole(["EXPERT", "ADMIN"]), updateTopic);

router.delete(
  "/:id",
  authenticate,
  checkRole(["EXPERT", "ADMIN"]),
  deleteTopic,
);
router.get("/", getAllTopics);

export default router;
