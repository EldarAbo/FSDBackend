// gptApiService.js
import { runPythonScript } from './pythonExecutor.js';
import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Processes a file (PDF or PPTX) using generate_json.py script
 * @param {string} filePath - Path to the file
 * @param {string} fileType - Type of file ('pdf' or 'pptx')
 * @param {string} generateType - Type of generation ('test' or 'summary')
 * @returns {Promise<Object>} - The processed result as a JSON object
 */
export async function generateJsonFromFile(filePath, fileType = 'pdf', generateType = 'summary', numAmerican = 8, numOpen = 3, additionalPrompt = '') {
  try {
    console.log(`Processing file: ${filePath}`);
    
    const absoluteFilePath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, filePath);
    
    const args = [
      '--generate-type', generateType,
      '--file-type', fileType,
      '--input-file', absoluteFilePath
    ];
    
    // Add optional parameters if provided
    if (generateType === 'test') {
      args.push('--num-american', numAmerican.toString());
      args.push('--num-open', numOpen.toString());
    }
    
    if (additionalPrompt) {
      args.push('--additional-prompt', additionalPrompt);
    }
    
    await runPythonScript('generate_json.py', args);
    
    const resultPath = path.join(__dirname, 'output', 'response.json');
    const resultData = await fsPromises.readFile(resultPath, 'utf8');
    
    return JSON.parse(resultData);
  } catch (error) {
    console.error(`Error generating ${generateType} JSON from ${fileType}:`, error);
    throw error;
  }
}

/**
 * Generates an HTML exam from the processed JSON
 * @param {string} inputJsonFile - Path to the input JSON file
 * @param {string} outputHtmlFile - Path to the output HTML file
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export async function generateHtmlExam(inputJsonFile = 'output/response.json', outputHtmlFile = 'output/exam.html') {
  try {
    // Build the full paths
    const inputPath = path.join(__dirname, inputJsonFile);
    const outputPath = path.join(__dirname, outputHtmlFile);
    
    // Run the Python script to generate HTML from JSON with the required arguments
    await runPythonScript('generate_test_html_from_json.py', [
      '--input-file', inputPath,
      '--output-file', outputPath
    ]);

    // Return the path to the HTML file
    return outputPath;
  } catch (error) {
    console.error('Error generating HTML exam:', error);
    throw error;
  }
}

/**
 * Generates an HTML summary from the processed JSON
 * @param {string} inputJsonFile - Path to the input JSON file
 * @param {string} outputHtmlFile - Path to the output HTML file
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export async function generateHtmlSummary(inputJsonFile = 'output/response.json', outputHtmlFile = 'output/summary.html') {
  try {
    // Build the full paths
    const inputPath = path.join(__dirname, inputJsonFile);
    const outputPath = path.join(__dirname, outputHtmlFile);
    
    // Run the Python script to generate HTML from JSON with the required arguments
    await runPythonScript('generate_summary_html_from_json.py', [
      '--input-file', inputPath,
      '--output-file', outputPath
    ]);

    // Return the path to the HTML file
    return outputPath;
  } catch (error) {
    console.error('Error generating HTML summary:', error);
    throw error;
  }
}

/**
 * Processes a file and generates an HTML exam
 * @param {string} filePath - Path to the file
 * @param {string} fileType - Type of file ('pdf' or 'pptx')
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export async function processPdfAndGenerateHtmlExam(filePath = 'input.pdf', fileType = 'pdf', numAmerican = 8, numOpen = 3, additionalPrompt = '') {
  try {
    console.log(`Processing PDF file for exam: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Pass the parameters to generateJsonFromFile
    await generateJsonFromFile(filePath, fileType, 'test', numAmerican, numOpen, additionalPrompt);
    
    const htmlPath = await generateHtmlExam();
    
    return htmlPath;
  } catch (error) {
    console.error('Error in processPdfAndGenerateHtmlExam:', error);
    throw error;
  }
}

/**
 * Processes a file and generates an HTML summary
 * @param {string} filePath - Path to the file
 * @param {string} fileType - Type of file ('pdf' or 'pptx')
 * @returns {Promise<string>} - Path to the generated HTML file
 */
export async function processPdfAndGenerateHtmlSummary(filePath = 'input.pdf', fileType = 'pdf', additionalPrompt = '') {
  try {
    console.log(`Processing PDF file: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      throw new Error(`File not found: ${filePath}`);
    }
    
    // Pass the additional prompt parameter
    await generateJsonFromFile(filePath, fileType, 'summary', null, null, additionalPrompt);
    
    const htmlPath = await generateHtmlSummary();
    
    return htmlPath;
  } catch (error) {
    console.error('Error in processPdfAndGenerateHtmlSummary:', error);
    throw error;
  }
}

// Legacy functions kept for backward compatibility
export async function processPdfWithGpt(pdfPath) {
  console.warn('processPdfWithGpt is deprecated. Use generateJsonFromFile instead.');
  return generateJsonFromFile(pdfPath, 'pdf', 'summary');
}

export async function processTextWithGpt() {
  console.warn('processTextWithGpt is deprecated. This function needs to be updated.');
  try {
    // This function doesn't match your new workflow. It should be updated.
    const resultPath = path.join(__dirname, 'output', 'response.json');
    const resultData = await fsPromises.readFile(resultPath, 'utf8');
    
    return JSON.parse(resultData);
  } catch (error) {
    console.error('Error processing text with GPT:', error);
    throw error;
  }
}