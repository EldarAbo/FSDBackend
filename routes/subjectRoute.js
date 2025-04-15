import express from "express";
import mongoose from "mongoose";
const router = express.Router();
import subjectController from "../controllers/subjectController.js";
import authController from "../controllers/authController.js";

/**
 * @swagger
 * tags:
 *   name: Subjects
 *   description: The Subjects API
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /subjects/user/{userId}:
 *   get:
 *     summary: Get all subjects created by a specific user
 *     tags: [Subjects]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: List of subjects created by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Subject'
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.get("/user/:userId", authController.authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid userId");
    }
    const subjects = await subjectController.getSubjectsByUserId(userId);
    res.status(200).send(subjects);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

router.get("/:id", authController.authMiddleware, subjectController.getById.bind(subjectController));
router.post("/", authController.authMiddleware, subjectController.create.bind(subjectController));
router.put("/:id", authController.authMiddleware, subjectController.updateItem.bind(subjectController));
router.delete("/:id", authController.authMiddleware, subjectController.deleteItem.bind(subjectController));

export default router;