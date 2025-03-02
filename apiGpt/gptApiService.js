// gptApiService.js
import { runPythonScript } from './pythonExecutor.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Processes a PDF file using GPT API and returns the result
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<Object>} - The processed result as a JSON object
 */
export async function processPdfWithGpt(pdfPath) {
  try {
    // Run the Python script that processes the file
    await runPythonScript('api_test.py');
    
    // Read the result from the response.json file
    const resultPath = path.join(__dirname, 'apiGpt', 'response.json');
    const resultData = await fs.readFile(resultPath, 'utf8');
    
    return JSON.parse(resultData);
  } catch (error) {
    console.error('Error processing PDF with GPT:', error);
    throw error;
  }
}

/**
 * Processes text content using GPT API
 * @param {string} textContent - The text content to process
 * @returns {Promise<Object>} - The processed result as a JSON object
 */
export async function processTextWithGpt() {
  try {
    // Run the Python script without file attachments
    await runPythonScript('api_test_no_files.py');
    
    // Read the result from the response.json file
    const resultPath = path.join(__dirname, 'apiGpt', 'response.json');
    const resultData = await fs.readFile(resultPath, 'utf8');
    
    return JSON.parse(resultData);
  } catch (error) {
    console.error('Error processing text with GPT:', error);
    throw error;
  }
}

/**
 * Generates an HTML exam from the processed GPT response
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export async function generateHtmlExam() {
  try {
    // Run the Python script to generate HTML from JSON
    await runPythonScript('generate_html_from_json.py');
    
    // Return the path to the HTML file
    return path.join(__dirname, 'apiGpt', 'exam.html');
  } catch (error) {
    console.error('Error generating HTML exam:', error);
    throw error;
  }
}