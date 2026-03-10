import { Router } from "express";

import { getTopicWorkspace } from "./workspace.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/:id/workspace",authenticate, getTopicWorkspace);



export default router;
