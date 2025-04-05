import express from "express";
const router = express.Router();
import usersController from "../controllers/usersController.js";
import authController from "../controllers/authController.js";


/**
 * @swagger
 * tags:
 *   name: Users
 *   description: The Users API
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

router.get("/:id", authController.authMiddleware, usersController.getById.bind(usersController));

router.post("/", authController.authMiddleware, usersController.create.bind(usersController));

router.put("/:id", authController.authMiddleware, usersController.updateItem.bind(usersController));

export default router;

