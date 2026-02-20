import { Router } from "express";
import { authenticate, checkRole } from "../../middleware/auth.middleware";

const router = Router();

router.get(
  "/admin-only",
  authenticate,
  checkRole(["ADMIN"]),
  (req, res) => {
    res.json({ message: "Welcome Admin. Access granted." });
  }
);

export default router;
