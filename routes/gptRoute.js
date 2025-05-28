import express from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import axios from 'axios'; // Add axios for making HTTP requests
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';
import { 
  generateJsonFromFile, 
  generateHtmlExam, 
  generateHtmlSummary, 
  processPdfAndGenerateHtmlExam, 
  processPdfAndGenerateHtmlSummary 
} from '../apiGpt/gptApiService.js';
import contentController from '../controllers/contentController.js';

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
 * /gpt/upload-and-generate-summary:
 *   post:
 *     summary: Upload a file and generate an HTML summary in one step
 *     tags: [GPT]
 *     description: Uploads a PDF or PPTX file, processes it, and directly generates an HTML summary
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
 *               additionalPrompt:
 *                 type: string
 *                 description: Additional instructions for the summary generation
 *     responses:
 *       200:
 *         description: Returns the HTML summary
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
router.post('/upload-and-generate-summary', upload.single('file'), async (req, res) => {
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
    const additionalPrompt = req.body.prompt || '';  // Default to empty string if not provided
    
    // Process the file and generate the summary with the additional prompt
    const htmlPath = await processPdfAndGenerateHtmlSummary(
      filePath,
      fileType,
      additionalPrompt
    );
    
    //res.sendFile(htmlPath);

    try {
      // Get userId from the request body or use default
      const htmlContent = await fsPromises.readFile(htmlPath, 'utf8');
      const userId = req.body.userId || "67f3bd679937c252dacacee4"; // Default user ID if not provided
      const defaultTitle = `Summary - ${new Date().toLocaleDateString()}`;
      const subject = req.body.subject;
      
      // Create content by making a POST request to the content API
      const contentData = {
        userId: userId,
        content: htmlContent, // Use the actual HTML content
        subject: subject,
        title: defaultTitle,
        contentType: "Summary"
      };
      
      // Make a POST request to the content API endpoint
      // Assuming the API is running on the same server
      const apiResponse = await axios.post('http://localhost:3000/content', contentData);
      const contentId = apiResponse.data._id;

      console.log("Successfully saved summery content:", apiResponse.data._id);
      
    // Return both the HTML content and the contentId
    res.json({
      html: htmlContent,
      contentId: contentId
    });
    } catch (contentError) {
      console.error('Error saving content to database:', contentError);

    }

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
    let additionalPrompt = req.body.prompt || '';  // Default to empty string if not provided
    const difficulty = req.body.difficulty || 'Moderate';     // Default to Moderate if not provided

    additionalPrompt = additionalPrompt + '. Make it on a ' + difficulty + ' difficulty level.';
    // Process the file and generate the exam with the new parameters
    const htmlPath = await processPdfAndGenerateHtmlExam(
      filePath,
      fileType,
      numAmerican,
      numOpen,
      additionalPrompt
    );
    
    //res.sendFile(htmlPath);

    try {
      // Get userId from the request body or use default
      const htmlContent = await fsPromises.readFile(htmlPath, 'utf8');
      const userId = req.body.userId || "67f3bd679937c252dacacee4"; // Default user ID if not provided
      const defaultTitle = `Exam - ${difficulty} - ${new Date().toLocaleDateString()}`;
      const subject = req.body.subject;
      
      // Create content by making a POST request to the content API
      const contentData = {
        userId: userId,
        content: htmlContent, // Use the actual HTML content
        subject: subject,
        title: defaultTitle,
        contentType: "Exam"
      };
      
      // Make a POST request to the content API endpoint
      // Assuming the API is running on the same server
      const apiResponse = await axios.post('http://localhost:3000/content', contentData);
      const contentId = apiResponse.data._id;

      console.log("Successfully saved exam content:", apiResponse.data._id);
      
    // Return both the HTML content and the contentId
    res.json({
      html: htmlContent,
      contentId: contentId
    });
    } catch (contentError) {
      console.error('Error saving content to database:', contentError);

    }

  } catch (error) {
    console.error('Error processing file and generating exam:', error);
    res.status(500).json({ error: 'Failed to generate exam', details: error.message });
  }
});

export default router;