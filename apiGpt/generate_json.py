import argparse
import openai
import json
import fitz  # PyMuPDF
import io
import time
import sys
import os
import re
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

def compress_pdf_to_text(input_pdf_path):
    # Ensure the path is absolute
    if not os.path.isabs(input_pdf_path):
        input_pdf_path = os.path.abspath(input_pdf_path)
    
    print(f"Opening PDF file: {input_pdf_path}")
    
    # Check if file exists
    if not os.path.exists(input_pdf_path):
        raise FileNotFoundError(f"PDF file not found: {input_pdf_path}")
    
    # Open the input PDF
    doc = fitz.open(input_pdf_path)
    full_text = ""

    # Iterate through each page and apply optimizations
    for page_num in range(doc.page_count):
        page = doc.load_page(page_num)

        # Compress images and other content
        # Remove all annotations on the page
        for annot in page.annots():
            page.delete_annot(annot)
        # page.set_(None)  # Remove annotations to save space
        page.clean_contents()  # Clean up page contents

        # Extract text from the page and append it to the string
        full_text += page.get_text("text")  # Extract text as plain text

    return full_text

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
        return f"Generate a test with {num_american} American-style multiple choice questions and {num_open} open questions based on the following content. Each question should have 4 options, with exactly one correct answer."
    
    elif prompt_type == "summary":
        return "Generate a comprehensive summary of the following content. Include the main topics, key points, and any important details."
    
    else:
        raise ValueError(f"Unknown prompt type: {prompt_type}")

def generate_content(
    generate_type, initial_prompt, response_structure, text_input
) -> int:
    # Step 1: Read API key from file
    api_key = read_api_key()
    
    # Initialize OpenAI Client
    openai_client = openai.OpenAI(api_key=api_key)
    
    # Create more detailed instructions based on generate_type
    if generate_type == "summary":
        instructions = """
        You are an assistant that generates summaries as text input in JSON format.
        The generated response must contain at least 500 words in JSON format.
        Always return your response as valid JSON following the exact structure provided.
        Do not include any explanations, code blocks, or formatting outside the JSON.
        The JSON should be directly parseable by Python's json.loads() function.
        """
    else:  # test
        instructions = """
        You are an assistant that generates tests based on text input in JSON format.
        Always return your response as valid JSON following the exact structure provided.
        Do not include any explanations, code blocks, or formatting outside the JSON.
        The JSON should be directly parseable by Python's json.loads() function.
        """

    # Step 2: Create an Assistant
    assistant = openai_client.beta.assistants.create(
        name="Test/Summary Generator",
        instructions=instructions,
        model="gpt-4o-mini",
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
    
    Input content for {generate_type}:
    {text_input}
    
    Return your response in valid JSON format according to this structure:
    {json.dumps(response_structure, indent=2)}
    
    VERY IMPORTANT: Your entire response must be valid, parseable JSON only. 
    Do not include any explanatory text, markdown formatting, or code blocks around the JSON.
    """
    
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
        max_completion_tokens=20000,
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
    parsed_json = extract_and_parse_json(response_text, generate_type)

    output_dir = os.path.join(script_dir, "output")
    if not os.path.exists(output_dir):
        os.makedirs(output_dir, recursive=True)

    output_file = os.path.join(output_dir, "response.json")
    with open(output_file, "w", encoding="utf-8") as json_file:
        json.dump(parsed_json, json_file, indent=4, ensure_ascii=False)

    print(f"Response saved to {output_file}")

    return 0

def extract_and_parse_json(text, generate_type):
    """
    Enhanced function to extract and parse JSON from various formats.
    Uses multiple strategies to find valid JSON within text.
    
    Args:
        text (str): The text containing JSON
        generate_type (str): Type of generation ('test' or 'summary')
        
    Returns:
        dict: Parsed JSON or fallback structure
    """
    # Save original response for debugging
    debug_file = os.path.join(script_dir, "debug_response.txt")
    with open(debug_file, "w", encoding="utf-8") as f:
        f.write(text)
    
    # Try to directly parse the entire text first
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    
    # Strategy 1: Look for code blocks with JSON (```json ... ```)
    json_blocks = re.findall(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
    
    # Try each extracted block
    for block in json_blocks:
        try:
            # Handle potential Unicode issues and escape sequences
            block = block.encode('utf-8').decode('unicode_escape')
            return json.loads(block)
        except json.JSONDecodeError:
            continue
    
    # Strategy 2: Look for complete JSON objects (starting with { and ending with })
    # Make this more precise by finding the largest valid JSON object
    possible_json = re.findall(r'(\{[\s\S]*\})', text)
    possible_json.sort(key=len, reverse=True)  # Try longest matches first
    
    for json_str in possible_json:
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            # Try cleaning the string
            try:
                # Remove any markdown formatting or non-JSON content
                cleaned = re.sub(r'[^\{\}\[\]\,\:\"\'0-9a-zA-Z_\s\.\-]', '', json_str)
                return json.loads(cleaned)
            except json.JSONDecodeError:
                continue
    
    # If we still have no valid JSON, try to build a structure from the text content
    if generate_type == "test":
        questions = []
        # Look for sections that might be questions
        question_blocks = re.split(r'\n\s*\d+[\.\)]\s*', text)
        
        for block in question_blocks:
            if len(block.strip()) < 30:  # Skip short blocks
                continue
                
            # Try to extract question and options
            lines = block.strip().split('\n')
            if not lines:
                continue
                
            question_text = lines[0].strip()
            options = []
            
            for line in lines[1:]:
                if re.match(r'^[A-D][\.\)]', line.strip()):
                    options.append(line.strip()[2:].strip())
            
            if question_text and options:
                questions.append({
                    "question": question_text,
                    "type": "american",
                    "answers": options,
                    "correct_answer": options[0] if options else ""
                })
            elif question_text:
                questions.append({
                    "question": question_text,
                    "type": "open"
                })
        
        if questions:
            return {
                "title": "Extracted Test",
                "description": "Test questions extracted from text",
                "questions": questions
            }
    
    # Create a fallback structure as last resort
    return create_fallback_json(generate_type)


def fix_json_quotes(text):
    """
    Fixes mismatched or incorrect quotes in JSON strings
    """
    # Replace single quotes with double quotes (except those in strings)
    in_string = False
    in_single_quote_string = False
    result = []
    
    i = 0
    while i < len(text):
        char = text[i]
        
        # Check for escaped characters
        if char == '\\' and i + 1 < len(text):
            result.append(char)
            i += 1
            result.append(text[i])
            i += 1
            continue
            
        # Track string state
        if char == '"' and not in_single_quote_string:
            in_string = not in_string
            result.append(char)
        elif char == "'" and not in_string:
            in_single_quote_string = not in_single_quote_string
            result.append('"')  # Replace with double quote
        elif char == "'" and in_string:
            result.append("\\'")  # Escape single quote in double quote string
        else:
            result.append(char)
        
        i += 1
    
    return ''.join(result)

def fix_json_string(text):
    """
    Comprehensive JSON string fixing
    """
    # Step 1: Replace single quotes with double quotes outside of strings
    text = fix_json_quotes(text)
    
    # Step 2: Fix unquoted keys
    text = re.sub(r'(\{|\,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:', r'\1"\2":', text)
    
    # Step 3: Fix trailing commas
    text = re.sub(r',\s*(\}|\])', r'\1', text)
    
    # Step 4: Fix missing commas between objects
    text = re.sub(r'(\}|\])\s*(\{|\[)', r'\1,\2', text)
    
    # Step 5: Fix unquoted boolean values
    text = re.sub(r':\s*(true|false)\s*([,\}])', r':"\\1"\2', text)
    
    # Step 6: Fix empty values
    text = re.sub(r':\s*,', r':null,', text)
    
    return text


def extract_questions_from_text(text):
    """
    Advanced extraction of test questions from text when JSON parsing fails
    
    Args:
        text (str): Text containing questions
        
    Returns:
        list: List of question dictionaries or None
    """
    questions = []
    
    # Pattern 1: Look for numbered questions (1., 2., etc.)
    numbered_pattern = r'(?:^|\n)(?:\d+[\.\)]\s*)(.*?)(?=(?:\n\d+[\.\)]\s*)|$)'
    numbered_questions = re.findall(numbered_pattern, text, re.DOTALL)
    
    # Pattern 2: Look for questions marked with Q:
    q_pattern = r'(?:^|\n)(?:Q|Question)(?:\s*\d*)?[\.\:\)]\s*(.*?)(?=(?:\n(?:Q|Question)(?:\s*\d*)?[\.\:\)]\s*)|$)'
    q_questions = re.findall(q_pattern, text, re.DOTALL)
    
    # Use whichever pattern found more questions
    question_blocks = numbered_questions if len(numbered_questions) >= len(q_questions) else q_questions
    
    # If still no questions found, try to split by double newlines
    if not question_blocks:
        split_blocks = re.split(r'\n\s*\n', text)
        question_blocks = [block for block in split_blocks if len(block.strip()) > 30]  # Filter short blocks
    
    for block in question_blocks:
        if not block.strip():
            continue
        
        # Try to identify options for multiple choice
        option_patterns = [
            r'(?:^|\n)(?:[A-D][\.\)]\s*)(.*?)(?=(?:\n[A-D][\.\)]\s*)|$)',  # A., B., etc.
            r'(?:^|\n)(?:\([A-D]\)\s*)(.*?)(?=(?:\n\([A-D]\)\s*)|$)',      # (A), (B), etc.
            r'(?:^|\n)(?:Option [A-D][\.\:]\s*)(.*?)(?=(?:\n(?:Option [A-D][\.\:]\s*))|$)'  # Option A:, etc.
        ]
        
        options = []
        for pattern in option_patterns:
            found_options = re.findall(pattern, block, re.DOTALL)
            if len(found_options) >= 2:  # Found multiple choice options
                options = found_options
                break
        
        if options and len(options) >= 2:  # At least 2 options to be a valid multiple choice
            # This is a multiple choice question
            # Extract the question text (everything before the first option)
            option_start = block.find(options[0])
            question_text = block[:option_start].strip() if option_start > 0 else block.split('\n')[0].strip()
            
            # Clean up answers
            answers = [opt.strip() for opt in options]
            
            # Try to find correct answer indication
            correct_index = None
            correct_markers = [r'\*', r'\(correct\)', r'correct answer', r'answer:']
            
            for i, opt in enumerate(answers):
                if any(re.search(marker, opt.lower()) for marker in correct_markers):
                    correct_index = i
                    # Clean the marker from the answer
                    for marker in correct_markers:
                        answers[i] = re.sub(marker, '', opt, flags=re.IGNORECASE).strip()
            
            correct_answer = answers[correct_index] if correct_index is not None else answers[0]
            
            questions.append({
                "question": question_text,
                "type": "american",
                "answers": answers,
                "correct_answer": correct_answer
            })
        else:
            # This is likely an open question
            questions.append({
                "question": block.strip(),
                "type": "open"
            })
    
    return questions if questions else None

def extract_summary_from_text(text):
    """
    Advanced extraction of summary content when JSON parsing fails
    
    Args:
        text (str): Text containing summary
        
    Returns:
        str: Extracted summary or None
    """
    # Remove code blocks and their contents
    cleaned_text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    
    # Try to find a structure that looks like a summary
    summary_sections = [
        re.search(r'Summary:(.*?)(?:\n\n|\n#|\Z)', cleaned_text, re.DOTALL),
        re.search(r'Overview:(.*?)(?:\n\n|\n#|\Z)', cleaned_text, re.DOTALL),
        re.search(r'Main Points:(.*?)(?:\n\n|\n#|\Z)', cleaned_text, re.DOTALL)
    ]
    
    for section in summary_sections:
        if section and len(section.group(1).strip()) > 100:
            return section.group(1).strip()
    
    # If no structured summary found, remove instruction-like lines
    lines = cleaned_text.split('\n')
    content_lines = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        # Skip lines that look like instructions
        if any(phrase in line.lower() for phrase in [
            'json format', 'here is', 'as requested', 'generated summary',
            'below is', 'i have generated', 'please find'
        ]):
            continue
        content_lines.append(line)
    
    # Join and return the remaining text
    summary = '\n'.join(content_lines)
    
    # If still too short, return None
    if len(summary) < 150:  # Increased threshold
        return None
        
    return summary

# Add a utility function to create a fallback JSON structure
def create_fallback_json(generate_type):
    """Creates a basic fallback JSON when parsing fails"""
    import re
    
    if generate_type == "summary":
        return {
            "summary": "Error processing document. Please try again with a different document.",
            "subjects": ["Error processing document"]
        }
    else:  # test
        return {
            "title": "Error processing document",
            "description": "Could not generate test questions. Please try again.",
            "questions": [
                {
                    "question": "Error processing document",
                    "type": "american",
                    "answers": ["Option A", "Option B", "Option C", "Option D"],
                    "correct_answer": "Option A"
                }
            ]
        }

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
    params = {"num_of_american": 8, "num_of_open": 3} if generate_type == "test" else {}
    initial_prompt = get_prompt(prompt_type=generate_type, params=params)

    # Extract text from the input file
    if file_type == "pdf":
        total_input = compress_pdf_to_text(input_file)
  #  elif file_type == "pptx":
  #      total_input = extract_text_from_pptx(input_file)
    else:
        print("Error: Unsupported file type.")
        sys.exit(1)

    # Generate content
    result = generate_content(
        generate_type=generate_type,
        initial_prompt=initial_prompt,
        response_structure=response_structure,
        text_input=total_input,
    )

    print("Exit code:", result)