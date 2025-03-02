import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processPdfWithGpt, processTextWithGpt, generateHtmlExam } from '../apiGpt/gptApiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, 'apiGpt');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, '1.pdf'); // Using the fixed filename as your Python script expects
  }
});

const upload = multer({ storage: storage });

/**
 * @swagger
 * tags:
 *   name: GPT
 *   description: GPT API integration endpoints
 */

/**
 * @swagger
 * /gpt/process-pdf:
 *   post:
 *     summary: Process a PDF file using GPT
 *     tags: [GPT]
 *     description: Uploads a PDF file and processes it using OpenAI's GPT API
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: PDF file to be processed
 *     responses:
 *       200:
 *         description: Successfully processed PDF
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: string
 *                   description: Summary of the PDF content
 *       400:
 *         description: No file uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/process-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const result = await processPdfWithGpt();
    res.json(result);
  } catch (error) {
    console.error('Error processing PDF:', error);
    res.status(500).json({ error: 'Failed to process PDF' });
  }
});

/**
 * @swagger
 * /gpt/process-text:
 *   post:
 *     summary: Process text using GPT
 *     tags: [GPT]
 *     description: Processes text content using OpenAI's GPT API
 *     responses:
 *       200:
 *         description: Successfully processed text
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exam:
 *                   type: object
 *                   properties:
 *                     multiple_choice:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           question:
 *                             type: string
 *                           options:
 *                             type: array
 *                             items:
 *                               type: string
 *                           answer:
 *                             type: string
 *                     open_questions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           question:
 *                             type: string
 *                           answer:
 *                             type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.post('/process-text', async (req, res) => {
  try {
    const result = await processTextWithGpt();
    res.json(result);
  } catch (error) {
    console.error('Error processing text:', error);
    res.status(500).json({ error: 'Failed to process text' });
  }
});

/**
 * @swagger
 * /gpt/generate-exam:
 *   get:
 *     summary: Generate an HTML exam
 *     tags: [GPT]
 *     description: Generates an HTML exam based on the processed GPT response
 *     produces:
 *       - text/html
 *     responses:
 *       200:
 *         description: Returns the HTML exam
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 */
router.get('/generate-exam', async (req, res) => {
  try {
    const htmlPath = await generateHtmlExam();
    res.sendFile(htmlPath);
  } catch (error) {
    console.error('Error generating exam:', error);
    res.status(500).json({ error: 'Failed to generate exam' });
  }
});

export default router;