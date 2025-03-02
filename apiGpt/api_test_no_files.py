import openai
import json
import time

# Step 1: Read API key from file
def read_api_key(file_path="api_key.txt"):
    with open(file_path, "r") as f:
        return f.read().strip()

api_key = read_api_key()

# Initialize OpenAI Client
openai_client = openai.OpenAI(api_key=api_key)

# Step 2: Create an Assistant
assistant = openai_client.beta.assistants.create(
    name="Text Summarizer",
    instructions="You are an assistant that summarizes text input in JSON format.",
    model="gpt-4o"
)
assistant_id = assistant.id

print(f"Assistant created: {assistant_id}")

# Step 3: Create a Thread
thread = openai_client.beta.threads.create()
thread_id = thread.id

print(f"Thread created: {thread_id}")

import fitz  # PyMuPDF
import io

def compress_pdf_to_variable(input_pdf_path):
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

# Example usage
input_pdf_path = '1.pdf'
compressed_pdf = compress_pdf_to_variable(input_pdf_path)

data = {
    "exam": {
        "multiple_choice": [
            {
                "question": "מהי מטרת שיטת Cross-Validation?",
                "options": [
                    "א. להערכת ביצועי אלגוריתם למידה",
                    "ב. מניעת בעיית underflow ב-Naïve Bayes",
                    "ג. יצירת עץ החלטה עם כמה שיותר פיצולים",
                    "ד. אף תשובה אינה נכונה"
                ],
                "answer": "א"
            }
        ],
        "open_questions": [
            {
                "question": "הסבר את ההבדל בין SVM לאלגוריתם פרספטרון.",
                "answer": "SVM משפר את ההכללה של המודל על ידי בחירת hyperplane עם המרווח המקסימלי, בעוד שפרספטרון עובד עם עדכון פשוט של משקולות."
            }
        ]
    }
}

text_input = compressed_pdf
content = f'Create a test for me based on the material in the files, which will contain 8 American questions and 3 open-ended ones. The test: {text_input} return in JSON format acording to the format: {data}'

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
)

print("Processing...")

# Step 7: Wait for Completion & Retrieve the Response
while True:
    run_status = openai_client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
    if run_status.status == "completed":
        print("Processing completed.")
        break
    elif run_status.status == "failed":
        print("Error: Processing failed.")
        print(run_status)
        exit(1)
    print(run_status)
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

# Step 9: Save Response to JSON File
json_output = response_text

cleaned_text = response_text.replace("```json\n", "").replace("\n```", "").replace("\n","")                                                                            

# Parse the cleaned text as a JSON string
parsed_json = json.loads(cleaned_text)

with open("response.json", "w", encoding="utf-8") as json_file:
    json.dump(parsed_json, json_file, indent=4,ensure_ascii=False)

print("Response saved to response.json")