import { Router } from "express";

import { getTopicsFeed } from "./workspace.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/",authenticate, getTopicsFeed);



export default router;
