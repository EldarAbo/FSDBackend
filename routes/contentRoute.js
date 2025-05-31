import express from "express";
import mongoose from "mongoose";
const router = express.Router();
import contentController from "../controllers/contentController.js";
import authController from "../controllers/authController.js";

/**
 * @swagger
 * tags:
 *   name: Content
 *   description: The Content API for managing HTML content
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Content:
 *       type: object
 *       required:
 *         - userId
 *         - content
 *         - contentType
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated ID
 *         userId:
 *           type: string
 *           description: ID of the user who owns this content
 *         content:
 *           type: string
 *           description: HTML content data
 *         title:
 *           type: string
 *           description: Title of the content
 *         contentType:
 *           type: string
 *           enum: [Summary, Exam]
 *           description: Type of the content
 *         deleted:
 *           type: boolean
 *           description: Soft delete flag
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           description: Deletion timestamp
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         creationDate:
 *           type: string
 *           description: Formatted creation date (YYYY-MM-DD)
 *         creationTime:
 *           type: string
 *           description: Formatted creation time (HH:MM:SS)
 */

/**
 * @swagger
 * /content/user/{userId}:
 *   get:
 *     summary: Get all active content created by a specific user
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: List of active content created by the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 *       400:
 *         description: Invalid user ID
 *       500:
 *         description: Server error
 */
router.get("/user/:userId", authController.authMiddleware , async (req, res) => {
  try {
    const { userId } = req.params;
    const { subjectId } = req.query;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid userId");
    }

    const contents = await contentController.getContentByUserId(userId, subjectId);
    res.status(200).send(contents);
  } catch (error) {
    res.status(500).send(error.message);
  }
});


/**
 * @swagger
 * /content/user/{userId}/deleted:
 *   get:
 *     summary: Get all deleted content created by a specific user
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *     responses:
 *       200:
 *         description: List of deleted content
 *       400:
 *         description: Invalid user ID
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/deleted", authController.authMiddleware, contentController.getDeletedContent.bind(contentController));

/**
 * @swagger
 * /content/user/{userId}/type/{contentType}:
 *   get:
 *     summary: Get all active content of a specific type created by a user
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user
 *       - in: path
 *         name: contentType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Summary, Exam]
 *         description: The type of content
 *     responses:
 *       200:
 *         description: List of active content of specified type
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Server error
 */
router.get("/user/:userId/type/:contentType", authController.authMiddleware , async (req, res) => {
  try {
    const { userId, contentType } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send("Invalid userId");
    }
    
    if (!["Summary", "Exam"].includes(contentType)) {
      return res.status(400).send("contentType must be either 'Summary' or 'Exam'");
    }
    
    const contents = await contentController.getContentByUserIdAndType(userId, contentType);
    res.status(200).send(contents);
  } catch (error) {
    res.status(500).send(error.message);
  }
});

/**
 * @swagger
 * /content/shared:
 *   get:
 *     summary: Get all active shared content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of active shared content
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Content'
 *       401:
 *         description: Unauthorized
 */
router.get("/shared", authController.authMiddleware, contentController.getCheckedContent.bind(contentController));

/**
 * @swagger
 * /content/{id}:
 *   get:
 *     summary: Get active content by ID
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the content
 *     responses:
 *       200:
 *         description: Content details
 *       404:
 *         description: Content not found
 */
router.get("/:id", authController.authMiddleware, contentController.getById.bind(contentController));

/**
 * @swagger
 * /content:
 *   post:
 *     summary: Create new content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - content
 *               - contentType
 *             properties:
 *               userId:
 *                 type: string
 *               content:
 *                 type: string
 *               title:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [Summary, Exam]
 *     responses:
 *       201:
 *         description: Created
 *       400:
 *         description: Bad request
 */
router.post("/", contentController.create.bind(contentController));

/**
 * @swagger
 * /content/{id}:
 *   put:
 *     summary: Update active content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               title:
 *                 type: string
 *               contentType:
 *                 type: string
 *                 enum: [Summary, Exam]
 *     responses:
 *       200:
 *         description: Updated
 *       404:
 *         description: Content not found
 */
router.put("/:id", authController.authMiddleware , contentController.updateItem.bind(contentController));

/**
 * @swagger
 * /content/{id}:
 *   delete:
 *     summary: Soft delete content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content soft deleted
 *       404:
 *         description: Content not found
 */
router.delete("/:id", authController.authMiddleware, contentController.deleteItem.bind(contentController));

/**
 * @swagger
 * /content/{id}/restore:
 *   put:
 *     summary: Restore soft-deleted content
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content restored
 *       404:
 *         description: Deleted content not found
 */
router.put("/:id/restore", authController.authMiddleware, contentController.restoreItem.bind(contentController));

/**
 * @swagger
 * /content/{id}/permanent:
 *   delete:
 *     summary: Permanently delete content (admin only)
 *     tags: [Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Content permanently deleted
 *       404:
 *         description: Content not found
 */
router.delete("/:id/permanent", authController.authMiddleware, contentController.permanentlyDeleteItem.bind(contentController));

export default router;