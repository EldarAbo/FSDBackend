import argparse
import openai
import json
import fitz  # PyMuPDF
import io
import time
import sys
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding='utf-8')

#from pptx import Presentation


script_dir = os.path.dirname(os.path.abspath(__file__))

def get_file_path(filename):
    """Returns absolute path to a file in the script directory."""
    return os.path.join(script_dir, filename)

def read_api_key(file_path = os.path.join(script_dir, 'api_key.txt')):
    with open(file_path, "r") as f:
        return f.read().strip()
    
# def extract_text_from_pptx(pptx_path):
#     prs = Presentation(pptx_path)
#     text = []
    
#     for slide in prs.slides:
#         for shape in slide.shapes:
#             if hasattr(shape, "text"):
#                 text.append(shape.text)
    
#     return "\n".join(text)

import os
import fitz  # PyMuPDF
from collections import Counter, defaultdict

def compress_pdf_to_text(input_pdf_path, skip_header_footer=True, merge_lines=True):
    """
    Extracts and cleans text from a PDF, optimized for structured Hebrew content.
    - skip_header_footer: detect and remove repeated headers/footers across pages
    - merge_lines: merge lines that are broken mid-sentence
    """
    # Ensure absolute path
    if not os.path.isabs(input_pdf_path):
        input_pdf_path = os.path.abspath(input_pdf_path)
    if not os.path.exists(input_pdf_path):
        raise FileNotFoundError(f"PDF file not found: {input_pdf_path}")

    doc = fitz.open(input_pdf_path)
    pages_text = []
    header_candidates = []
    footer_candidates = []

    # First pass: collect first and last lines as header/footer candidates
    for page in doc:
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (round(b[1]), round(b[0])))
        lines = [b[4].strip() for b in blocks if b[4].strip()]
        if lines:
            header_candidates.append(lines[0])
            footer_candidates.append(lines[-1])

    # Determine repeated headers/footers
    header_counts = Counter(header_candidates)
    footer_counts = Counter(footer_candidates)
    common_header = header_counts.most_common(1)[0][0] if header_counts else None
    common_footer = footer_counts.most_common(1)[0][0] if footer_counts else None

    # Second pass: extract and clean text
    for page in doc:
        blocks = page.get_text("blocks")
        blocks.sort(key=lambda b: (round(b[1]), round(b[0])))
        page_lines = []
        for b in blocks:
            text = b[4].strip()
            if not text:
                continue
            if skip_header_footer:
                if text == common_header or text == common_footer:
                    continue
            page_lines.append(text)

        # Optionally merge lines that don't end with punctuation
        if merge_lines:
            merged = []
            buffer = ""
            for line in page_lines:
                if buffer:
                    # if previous line seems incomplete
                    if not buffer[-1] in '.?!:;"' and not buffer.endswith('"'):
                        buffer += ' ' + line
                        continue
                    else:
                        merged.append(buffer)
                        buffer = line
                else:
                    buffer = line
            if buffer:
                merged.append(buffer)
            page_lines = merged

        pages_text.extend(page_lines)

    doc.close()
    # Join pages with blank line for separation
    return "\n".join(pages_text)


# Define the missing get_prompt function
def get_prompt(prompt_type, params=None):
    """
    Returns a prompt based on the type and parameters.
    
    Args:
        prompt_type (str): Either 'test' or 'summary'
        params (dict): Optional parameters for the prompt
    
    Returns:
        str: The prompt text
    """
    if prompt_type == "test":
        num_american = params.get("num_of_american", 8)
        num_open = params.get("num_of_open", 3)
        additional = params.get("additional_prompt", "")
        
        base_prompt = f"Generate a test with {num_american} multiple choice questions and {num_open} open questions based on the following content only. Each question should directly relate to the main topics in the provided content. Each multiple choice question should have 4 options, with exactly one correct answer. Do not use generic or placeholder questions - all questions must be specifically about the content provided and. All text be written in Hebrew. Please make sure you read the content carefully and create questions that are relevant and meaningful. The questions should be clear, concise, and test the understanding of the material. The response must be in JSON format with the following structure:\n\n"      
        # Add additional instructions if provided
        if additional:
            base_prompt = f"{base_prompt} {additional}"
            
        return base_prompt
    
    elif prompt_type == "summary":
        additional = params.get("additional_prompt", "")
        base_prompt = "Create a summary for me based on the material in the files. Make sure the summary is rich in content and well organized. Replace the subjects from the json with actual titles. Make the response as lengthy as possible, min 20 percent of actual size. Notes: Ensure that the summary is detailed, rich in content, and written in Hebrew."
        
        # Add additional instructions if provided
        if additional:
            base_prompt = f"{base_prompt} {additional}"
            
        return base_prompt

def generate_content(
    generate_type, initial_prompt, response_structure, text_input
) -> int:
    # Step 1: Read API key from file
    api_key = read_api_key()
    
    # Initialize OpenAI Client
    openai_client = openai.OpenAI(api_key=api_key)
    
    # Create more detailed instructions based on generate_type
    instructions = instructions = """
    You are an expert academic assistant specializing in generating high-quality educational content in Hebrew. 

    For TEST GENERATION:
    - Create {num_american} multiple-choice questions (4 options each, one correct answer)
    - Create {num_open} open-ended questions
    - All questions MUST be directly based on the provided content
    - Ensure questions test comprehension, analysis, and application of the material
    - Format all questions clearly in Hebrew with proper grammar and syntax
    - Return ONLY valid JSON following the exact structure provided

    For SUMMARY GENERATION:
    - Create a comprehensive summary covering all key concepts
    - Organize content logically with clear section headings
    - The summary should be very very long and detailed
    - Include important definitions, theories, and examples
    - Use academic Hebrew with proper terminology
    - Return ONLY valid JSON following the exact structure provided

    GENERAL REQUIREMENTS:
    - All output must be in proper Hebrew (right-to-left text, no reversed characters)
    - Never add explanatory text outside the JSON structure
    - Maintain academic rigor and accuracy
    - Adapt complexity to match the input material level
    
     EXAMPLE OF CORRECT HEBREW IN JSON:
        {{
            "question": "\\\\u202Eמהו הנושא הראשי?\\\\u202C",
            "options": [
                "\\\\u202Eתשובה א\\\\u202C",
                "\\\\u202Eתשובה ב\\\\u202C"
            ]
        }}
    
    CRITICAL HEBREW TEXT RULES:
        1. ALL Hebrew text must maintain proper right-to-left display
        2. Never reverse Hebrew character order
        3. Use Unicode explicit direction marks when needed:
        - \u202B (RTL start) 
        - \u202C (RTL end)
        4. Test all Hebrew output for proper display
        
    Notes for mathematical content:
    - Use LaTeX formatting for equations
    - Ensure all mathematical symbols are correctly displayed in Hebrew context
    
    Do not return json values with one Quotation mark, always use double quotes.
    """

    # Step 2: Create an Assistant
    assistant = openai_client.beta.assistants.create(
        name="Test/Summary Generator",
        instructions=instructions,
        model="gpt-4.1",  # Use the latest model
    )
    assistant_id = assistant.id

    print(f"Assistant created: {assistant_id}")

    # Step 3: Create a Thread
    thread = openai_client.beta.threads.create()
    thread_id = thread.id

    print(f"Thread created: {thread_id}")

    # Format the content to emphasize JSON requirements
    content = f"""
        {initial_prompt}

        SOURCE MATERIAL:
        {text_input}

        SPECIFIC INSTRUCTIONS:
        1. Analyze the content thoroughly before generating output
        2. For tests: Ensure questions cover all key topics proportionally
        3. For summaries: Include all major concepts with supporting details
        4. Use academic Hebrew throughout - no slang or informal language
        5. Format lists and bullet points clearly where appropriate
        6. Double-check that all Hebrew text displays correctly

        OUTPUT REQUIREMENTS:
        - Strictly follow this JSON structure:
        {response_structure}
        - The JSON must be valid and parseable
        - No additional text outside the JSON structure
        - All Hebrew text must be properly formatted
        
        HEBREW TEXT REQUIREMENTS:
            1. Add Unicode direction marks: \u202B before Hebrew text, \u202C after
            2. Example: \u202Bטקסט בעברית\u202C
            3. Verify no letters are reversed in the output
            4. If using JSON: escape direction marks properly

        IMPORTANT NOTES:
        - Pay special attention to proper Hebrew diacritics (nikud) when relevant
        - Maintain consistent terminology throughout
        - For tests: Avoid trivial questions - focus on meaningful assessment
        - For summaries: Include conceptual relationships between ideas
        """
    print(content)

    # Step 5: Send a Message with Text Input
    message = openai_client.beta.threads.messages.create(
        thread_id=thread_id,
        role="user",
        content=content,
    )

    print("Message sent to assistant.")

    # Step 6: Run the Assistant
    run = openai_client.beta.threads.runs.create(
        thread_id=thread_id,
        assistant_id=assistant_id,
        temperature=0.0,  # Adjust temperature for more deterministic output
        max_completion_tokens=30000,
    )

    print("Processing...")

    # Step 7: Wait for Completion & Retrieve the Response
    while True:
        run_status = openai_client.beta.threads.runs.retrieve(
            thread_id=thread_id, run_id=run.id
        )
        if run_status.status == "completed":
            print("Processing completed.")
            break
        elif run_status.status == "failed":
            print("Error: Processing failed.")
            print(run_status)
            exit(1)
        print(f"Status: {run_status.status}")
        time.sleep(2)  # Wait before checking again

    # Step 8: Fetch Messages
    messages = openai_client.beta.threads.messages.list(thread_id=thread_id)

    # Extract assistant response
    response_text = None
    for msg in messages.data:
        if msg.role == "assistant":
            for content in msg.content:
                if content.type == "text":
                    response_text = content.text.value
                    break

    if not response_text:
        print("No response received.")
        exit(1)

    # Print the raw response for debugging
    print("Raw response:")
    print(response_text)

    # Step 9: Parse the JSON response with enhanced error handling
       # Step 9: Save Response to JSON File
    cleaned_text = (
        response_text.replace("```json\n", "").replace("\n```", "").replace("\n", "")
    )
    
    debug_file = os.path.join(script_dir, "debug_response.txt")
    with open(debug_file, "w", encoding="utf-8") as f:
        f.write(cleaned_text)

    # Parse the cleaned text as a JSON string
    parsed_json = json.loads(cleaned_text)

    output_dir = os.path.join(script_dir, "output")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, recursive=True)

    output_file = os.path.join(output_dir, "response.json")
    with open(output_file, "w", encoding="utf-8") as json_file:
        json.dump(parsed_json, json_file)

    print(f"Response saved to {output_file}")

    return 0

def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Generate test or summary from PDF or PPTX files."
    )
    parser.add_argument(
        "--generate-type", "-g",
        choices=["test", "summary"],
        required=True,
        help="Specify whether to generate a 'test' or a 'summary'."
    )
    parser.add_argument(
        "--file-type", "-f",
        choices=["pdf", "pptx"],
        required=True,
        help="Specify the file type (pdf or pptx)."
    )
    parser.add_argument(
        "--input-file", "-i",
        required=True,
        help="Path to the input PDF or PPTX file."
    )
    # Add new arguments for question counts
    parser.add_argument(
        "--num-american", "-ma",
        type=int, 
        default=8,
        help="Number of multiple-choice questions to generate (default: 8)"
    )
    parser.add_argument(
        "--num-open", "-mo",
        type=int,
        default=3,
        help="Number of open-ended questions to generate (default: 3)"
    )
    # Add argument for additional prompt instructions
    parser.add_argument(
        "--additional-prompt", "-ap",
        default="",
        help="Additional instructions to add to the prompt for the AI"
    )
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_arguments()
    generate_type = args.generate_type
    file_type = args.file_type
    input_file = args.input_file

    print(f"Generate type: {generate_type} | File type: {file_type} | Input file: {input_file}")

    # Load the appropriate response structure JSON
    response_structure_file = "test_json_structure.json" if generate_type == "test" else "summary_json_structure.json"
    response_structure_file = get_file_path(response_structure_file)
    with open(response_structure_file, "r", encoding="utf-8") as json_file:
        response_structure = json.load(json_file)

    # Define the initial prompt parameters
        params = {
        "num_of_american": args.num_american,
        "num_of_open": args.num_open,
        "additional_prompt": args.additional_prompt
    } if generate_type == "test" else {
        "additional_prompt": args.additional_prompt
    }
    initial_prompt = get_prompt(prompt_type=generate_type, params=params)

    # Extract text from the input file
    if file_type == "pdf":
        total_input = compress_pdf_to_text(input_file)[:25000]
  #  elif file_type == "pptx":
  #      total_input = extract_text_from_pptx(input_file)
    else:
        print("Error: Unsupported file type.")
        sys.exit(1)

    input_debug_file = os.path.join(script_dir, "input_debug.txt")
    with open(input_debug_file, "w", encoding="utf-8") as f:
        f.write(total_input)
    
    # Generate content
    result = generate_content(
        generate_type=generate_type,
        initial_prompt=initial_prompt,
        response_structure=response_structure,
        text_input=total_input,
    )

    print("Exit code:", result)