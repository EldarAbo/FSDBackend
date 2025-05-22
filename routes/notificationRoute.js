import express from "express";
import NotificationController from "../controllers/notificationController.js";

const router = express.Router();
const controller = new NotificationController();

/**
 * @swagger
 * /notifications:
 *   post:
 *     summary: Create a new notification
 *     description: Create a notification for a user.
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               subjectId:
 *                 type: string
 *               day:
 *                 type: string
 *               time:
 *                 type: object
 *                 properties:
 *                   hour:
 *                     type: integer
 *                   minute:
 *                     type: integer
 *               userId:
 *                 type: string
 *             required:
 *               - subjectId
 *               - day
 *               - time
 *               - userId
 *     responses:
 *       201:
 *         description: Notification created successfully.
 *       400:
 *         description: Bad request, invalid input.
 *       500:
 *         description: Internal server error.
 */
router.post("/", controller.createNotification.bind(controller));

/**
 * @swagger
 * /notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     description: Delete an existing notification by ID.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted successfully.
 *       404:
 *         description: Notification not found.
 */
router.delete("/:id", controller.deleteNotification.bind(controller));

/**
 * @swagger
 * /notifications/user/{userId}:
 *   get:
 *     summary: Get notifications for a specific user
 *     description: Fetch all notifications related to a specific user.
 *     tags:
 *       - Notifications
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of notifications.
 *       404:
 *         description: User not found or no notifications available.
 */
router.get("/user/:userId", controller.getUserNotifications.bind(controller));

export default router;