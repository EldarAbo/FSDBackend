import express from "express";
const router = express.Router();
import usersController from "../controllers/usersController.js";
import multer from 'multer';

const upload = multer(); // For parsing multipart/form-data

/**
* @swagger
* components:
*   schemas:
*     User:
*       type: object
*       required:
*         - email
*         - password
*       properties:
*         username:
*           type: string
*           description: The user username
*         email:
*           type: string
*           description: The user email
*         password:
*           type: string
*           description: The user password
*       example:
*         username: 'Bobby'
*         email: 'bob@gmail.com'
*         password: '123456'
*/

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users.
 *     tags:
 *       - Users
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error.
 */

router.get("/", usersController.getAllUsers);


/**
 * @swagger
 * /users/{username}:
 *   get:
 *     summary: Get a user by username
 *     description: Retrieve a user by their username.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to retrieve.
 *     responses:
 *       200:
 *         description: A user object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */

router.get("/:username", usersController.getUserByUsername);


/**
 * @swagger
 * /users:
 *   post:
 *     summary: Create a new user
 *     description: Add a new user to the database.
 *     tags:
 *       - Users
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the user.
 *               email:
 *                 type: string
 *                 description: The email address of the user.
 *               password:
 *                 type: string
 *                 description: The email address of the user.
 *             example:
 *              username: 'BobbyBob1'
 *              email: 'bobb@gmail.com'
 *              password: '123456'
 *     responses:
 *       201:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request.
 *       500:
 *         description: Server error.
 */

router.post("/", usersController.createAUser);

/**
 * @swagger
 * /users/{username}:
 *   put:
 *     summary: Update a user's email
 *     description: Update a user's email address by their username.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: The updated email address.
 *             example:
 *               email: "newemail@example.com"
 *     responses:
 *       200:
 *         description: User updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found.
 *       400:
 *         description: Invalid request.
 *       500:
 *         description: Server error.
 */

router.put("/:username", usersController.updateUserEmailByUsername);


/**
 * @swagger
 * /users/{username}:
 *   delete:
 *     summary: Delete a user by username
 *     description: Remove a user by their username.
 *     tags:
 *       - Users
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: The username of the user to delete.
 *     responses:
 *       200:
 *         description: User deleted successfully.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */

router.delete("/:username", usersController.deleteUserByUsername);


router.post("/:username", upload.single('file'), usersController.updateUserImageByUsername);


export default router;