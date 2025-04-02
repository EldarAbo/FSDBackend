import openai
import json
import time
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

# Step 1: Read API key from file
def read_api_key(file_path = os.path.join(script_dir, 'api_key.txt')):
    with open(file_path, "r") as f:
        return f.read().strip()

api_key = read_api_key()

# Initialize OpenAI Client
openai_client = openai.OpenAI(api_key=api_key)

# Step 2: Upload the file
file_path = os.path.join(script_dir, "1.pdf") 
with open(file_path, "rb") as file:
    uploaded_file = openai_client.files.create(
        file=file,
        purpose="assistants"
    )
file_id = uploaded_file.id

print(f"File uploaded successfully: {file_id}")

# Step 3: Create an Assistant with "code_interpreter"
assistant = openai_client.beta.assistants.create(
    name="File Summarizer",
    instructions="You are an assistant that processes files and summarizes them in JSON format.",
    model="gpt-4o",
    tools=[{"type": "code_interpreter"}]  # ✅ Correct tool
)
assistant_id = assistant.id

print(f"Assistant created: {assistant_id}")

# Step 4: Create a Thread
thread = openai_client.beta.threads.create()
thread_id = thread.id

print(f"Thread created: {thread_id}")

# Step 5: Send a Message (Correct File Attachment)
message = openai_client.beta.threads.messages.create(
    thread_id=thread_id,
    role="user",
    content="Summarize this file in JSON format.",
    attachments=[{
        "file_id": file_id,
        "tools": [{"type": "code_interpreter"}]  # ✅ FIXED: Now an array of objects
    }]
)

print("Message sent to assistant.")

# Step 6: Run the Assistant
run = openai_client.beta.threads.runs.create(
    thread_id=thread_id,
    assistant_id=assistant_id,
    max_completion_tokens=500
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
    else:
        print(run_status)
        break
    time.sleep(2)  # Wait and check again

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
json_output = {"summary": response_text}

with open("response1.json", "w", encoding="utf-8") as json_file:
    json.dump(json_output, json_file, indent=4)

print("Response saved to response.json")