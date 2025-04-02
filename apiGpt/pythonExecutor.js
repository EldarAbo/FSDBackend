// pythonExecutor.js
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Executes a Python script with the given arguments
 * @param {string} scriptName - Name of the script (without path)
 * @param {Array} args - Array of arguments to pass to the script
 * @returns {Promise<string>} - The script's output
 */
export function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    // Build the full path to the script
    const scriptPath = path.join(__dirname, scriptName);
    
    // Build the command with arguments
    const argString = args.join(' ');
    const command = `python "${scriptPath}" ${argString}`;
    
    console.log(`Executing: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      // Always log output for debugging
      console.log(`Python stdout: ${stdout}`);
      
      if (stderr) {
        console.error(`Python stderr: ${stderr}`);
      }
      
      if (error) {
        console.error(`Python exit code: ${error.code}`);
        console.error(`Python error message: ${error.message}`);
        reject(new Error(`Python script failed: ${stderr || error.message}`));
        return;
      }
      
      resolve(stdout);
    });
  });
}