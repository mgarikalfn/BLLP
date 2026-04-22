import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getEconomyStatus,
  deductHeart,
  earnHeart,
  refillHearts,
  awardGems,
  claimReward,
  buyItem
} from "./economy.controller";

const router = Router();

router.use(authenticate); // Ensure all economy endpoints are authenticated

/**
 * @openapi
 * /api/economy/status:
 *   get:
 *     tags:
 *       - Economy
 *     summary: Get current economy status (gems, hearts, time until next heart)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success return gems and hearts
 */
router.get("/status", getEconomyStatus);

/**
 * @openapi
 * /api/economy/deduct-heart:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Deduct 1 heart (e.g. when failing a lesson)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Heart deducted successfully
 *       400:
 *         description: No hearts remaining
 */
router.post("/deduct-heart", deductHeart);

/**
 * @openapi
 * /api/economy/earn-heart:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Earn 1 heart (e.g. when completing practice)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Heart earned successfully
 *       400:
 *         description: Hearts already at maximum
 */
router.post("/earn-heart", earnHeart);

/**
 * @openapi
 * /api/economy/refill-hearts:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Spend 500 gems to refill all hearts
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hearts refilled successfully
 *       400:
 *         description: Insufficient funds or hearts already at maximum
 */
router.post("/refill-hearts", refillHearts);

/**
 * @openapi
 * /api/economy/award-gems:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Award a specific amount of gems
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 50
 *     responses:
 *       200:
 *         description: Gems awarded successfully
 *       400:
 *         description: Invalid gem amount
 */
router.post("/award-gems", awardGems);



/**
 * @openapi
 * /api/economy/claim-reward:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Claim reward for a completed quest or achievement
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - id
 *             properties:
 *               type:
 *                 type: string
 *                 description: "QUEST or ACHIEVEMENT"
 *                 example: "QUEST"
 *               id:
 *                 type: string
 *                 description: "The Quest or Achievement ID"
 *                 example: "647efbeabc321d000a123f11"
 *     responses:
 *       200:
 *         description: Reward claimed successfully
 *       400:
 *         description: Reward not eligible or Invalid payload
 *       404:
 *         description: Quest or Achievement not found
 */
router.post("/claim-reward", claimReward);

/**
 * @openapi
 * /api/economy/buy-item:
 *   post:
 *     tags:
 *       - Economy
 *     summary: Buy an item from the shop
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemType
 *             properties:
 *               itemType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Item purchased successfully
 */
router.post("/buy-item", buyItem);

export default router;
