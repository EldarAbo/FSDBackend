import express from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import { 
  generateJsonFromFile, 
  generateHtmlExam, 
  generateHtmlSummary, 
  processPdfAndGenerateHtmlExam, 
  processPdfAndGenerateHtmlSummary 
} from '../apiGpt/gptApiService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// Ensure output directory exists
const outputDir = path.join(__dirname, 'apiGpt', 'output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Similar to above, we need to make sure we're using the correct path
    const projectRoot = path.dirname(__dirname);
    const uploadPath = path.join(projectRoot, 'apiGpt');
    
    console.log(`Upload directory: ${uploadPath}`); // Add for debugging
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    cb(null, 'input.' + file.originalname.split('.').pop()); // Save as input.pdf or input.pptx
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
 * /gpt/process-file:
 *   post:
 *     summary: Process a PDF or PPTX file
 *     tags: [GPT]
 *     description: Uploads a PDF or PPTX file and processes it to generate JSON
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: file
 *         type: file
 *         required: true
 *         description: PDF or PPTX file to be processed
 *       - in: formData
 *         name: type
 *         type: string
 *         required: false
 *         description: Generation type (test or summary), default is summary
 *     responses:
 *       200:
 *         description: Successfully processed file
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error
 */
router.post('/process-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    const generateType = req.body.type || 'summary';
    
    if (fileType !== 'pdf' && fileType !== 'pptx') {
      return res.status(400).json({ error: 'Only PDF and PPTX files are supported' });
    }
    
    const result = await generateJsonFromFile(filePath, fileType, generateType);
    res.json(result);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).json({ error: 'Failed to process file', details: error.message });
  }
});

/**
 * @swagger
 * /gpt/generate-exam:
 *   get:
 *     summary: Generate an HTML exam
 *     tags: [GPT]
 *     description: Generates an HTML exam based on previously processed file
 *     produces:
 *       - text/html
 *     responses:
 *       200:
 *         description: Returns the HTML exam
 *       500:
 *         description: Server error
 */
router.get('/generate-exam', async (req, res) => {
  try {
    // Check if input.pdf exists, otherwise use default path
    const projectRoot = path.dirname(__dirname); // Go up one level from routes
    const filePath = path.join(projectRoot, 'apiGpt', 'input.pdf');
    
    console.log(`Looking for file at: ${filePath}`); // Add for debugging
    const fileExists = fs.existsSync(filePath);
    console.log(`File exists: ${fileExists}`); // Add for debugging
    
    const htmlPath = await processPdfAndGenerateHtmlExam(
      filePath,
      'pdf'
    );
    
    res.sendFile(htmlPath);
  } catch (error) {
    console.error('Error generating exam:', error);
    res.status(500).json({ error: 'Failed to generate exam', details: error.message });
  }
});

/**
 * @swagger
 * /gpt/generate-summary:
 *   get:
 *     summary: Generate an HTML summary
 *     tags: [GPT]
 *     description: Generates an HTML summary based on previously processed file
 *     produces:
 *       - text/html
 *     responses:
 *       200:
 *         description: Returns the HTML summary
 *       500:
 *         description: Server error
 */
router.post('/generate-summary', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    
    if (fileType !== 'pdf' && fileType !== 'pptx') {
      return res.status(400).json({ error: 'Only PDF and PPTX files are supported' });
    }
    
    // Extract the additional prompt parameter from request body
    const additionalPrompt = req.body.additionalPrompt || '';  // Default to empty string if not provided
    
    // Process the file and generate the summary with the additional prompt
    const htmlPath = await processPdfAndGenerateHtmlSummary(
      filePath,
      fileType,
      additionalPrompt
    );
    
    res.sendFile(htmlPath);
  } catch (error) {
    console.error('Error processing file and generating summary:', error);
    res.status(500).json({ error: 'Failed to generate summary', details: error.message });
  }
});


/**
 * @swagger
 * /gpt/upload-and-generate-exam:
 *   post:
 *     summary: Upload a file and generate an HTML exam in one step
 *     tags: [GPT]
 *     description: Uploads a PDF or PPTX file, processes it, and directly generates an HTML exam
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: PDF or PPTX file to be processed
 *     responses:
 *       200:
 *         description: Returns the HTML exam
 *         content:
 *           text/html:
 *             schema:
 *               type: string
 *       400:
 *         description: No file uploaded or invalid file type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/upload-and-generate-exam', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    const fileType = req.file.originalname.split('.').pop().toLowerCase();
    
    if (fileType !== 'pdf' && fileType !== 'pptx') {
      return res.status(400).json({ error: 'Only PDF and PPTX files are supported' });
    }
    
    // Extract the new parameters from request body
    const numAmerican = parseInt(req.body.numAmerican) || 8;  // Default to 8 if not provided
    const numOpen = parseInt(req.body.numOpen) || 3;          // Default to 3 if not provided
    const additionalPrompt = req.body.additionalPrompt || '';  // Default to empty string if not provided
    
    // Process the file and generate the exam with the new parameters
    const htmlPath = await processPdfAndGenerateHtmlExam(
      filePath,
      fileType,
      numAmerican,
      numOpen,
      additionalPrompt
    );
    
    res.sendFile(htmlPath);
  } catch (error) {
    console.error('Error processing file and generating exam:', error);
    res.status(500).json({ error: 'Failed to generate exam', details: error.message });
  }
});

export default router;