import argparse
import json
import random
import os
import sys

# Function to generate HTML
def generate_html(data):
    # Add more detailed logging to debug the data structure
    print("Data structure received:", json.dumps(list(data.keys()), indent=2))
    
    # Try different possible structures
    questions_list = []
    
    # Check for questions directly in the data
    if 'questions' in data and isinstance(data['questions'], list):
        print(f"Found questions array with {len(data['questions'])} items")
        questions_list = data['questions']
    # Check if data has an exam key with questions
    elif 'exam' in data and 'questions' in data['exam'] and isinstance(data['exam']['questions'], list):
        print(f"Found questions in exam array with {len(data['exam']['questions'])} items")
        questions_list = data['exam']['questions']
    # Check for multiple_choice and open_questions format
    elif 'multiple_choice' in data or 'open_questions' in data:
        print("Found separate multiple_choice and open_questions arrays")
        # No need to process, we'll handle this format directly later
    else:
        print("WARNING: Could not find question data in expected formats")
    
    # Process questions from the questions_list if we found them
    if questions_list:
        mc_questions = []
        open_questions = []
        
        for q in questions_list:
            if isinstance(q, dict) and 'type' in q:
                if q['type'] == 'american':
                    # Ensure we have the required fields
                    if 'question' in q and 'answers' in q:
                        mc_questions.append({
                            'question': q['question'],
                            'options': q['answers'],
                            'answer': q.get('correct_answer', q['answers'][0])
                        })
                elif q['type'] == 'open':
                    open_questions.append({
                        'question': q['question'],
                        'answer': q.get('answer', 'See solution guide')
                    })
        
        # Replace the data structure with our processed lists
        data = {
            'multiple_choice': mc_questions,
            'open_questions': open_questions
        }
        
        # Add title and description if they exist
        if 'title' in data:
            data['title'] = data['title']
        if 'description' in data:
            data['description'] = data['description']
    
    # Rest of the function continues as before...
    html_content = """
 <!DOCTYPE html>
    <html lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>מבחן</title>
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Assistant', sans-serif;
                direction: rtl;
                margin: 0;
                padding: 0;
                background-color: #faf7fc;
                color: #2c3e50;
            }
            .container {
                max-width: 900px;
                margin: 40px auto;
                padding: 40px;
                background-color: #f6edf9;
                border-radius: 16px;
                box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
            }
            h1, h2 {
                text-align: center;
                margin-bottom: 30px;
                color: #8c4ca8;
            }
            .question, .open-question {
                color: #8c4ca8;
                margin-bottom: 35px;
                padding: 24px;
                background-color: #F5F3F7;
                border-radius: 12px;
                border-right: 6px solid #4929B9;
                box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
            }
            .question p, .open-question p {
                font-size: 18px;
                margin: 10px 0;
            }
            .options p {
                margin: 8px 0;
                padding: 10px 14px;
                background-color: #FFFFFF;
                border-radius: 8px;
                transition: background-color 0.3s;
            }
            .options p:hover {
                background-color: #dce3e8;
            }
            .answer, .answer-text {
                font-weight: 600;
                color: #8c4ca8;
                margin-top: 18px;
                display: none;
            }
            .show-answer-btn {
                margin-top: 15px;
                padding: 10px 20px;
                background-color: #4929B9;
                color: #fff;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                transition: background-color 0.3s ease;
            }
            .show-answer-btn:hover {
                background-color: #8c4ca8;
            }
        </style>

        <script>
            function toggleAnswer(id) {
                var answer = document.getElementById(id);
                answer.style.display = (answer.style.display === "none" || answer.style.display === "") ? "block" : "none";
            }
        </script>
    </head>
    <body>
        <div class="container">
            <h1>מבחן</h1>
    """
    
    # Add title and description if available
    if 'title' in data:
        html_content = html_content.replace('<h1>מבחן</h1>', f'<h1>{data["title"]}</h1>')
    
    if 'description' in data:
        html_content += f'<p style="text-align:center">{data["description"]}</p>'
    
    # Add multiple choice questions section if there are any
    mc_questions = []
    if 'multiple_choice' in data:
        mc_questions = data['multiple_choice']
    elif 'exam' in data and 'multiple_choice' in data['exam']:
        mc_questions = data['exam']['multiple_choice']
    
    if mc_questions:
        html_content += """
            <h2>שאלות רב-ברירה</h2>
        """
        
        # Add multiple choice questions with shuffled options
        for index, question in enumerate(mc_questions):
            # Ensure options exist and are in the right format
            if 'options' in question:
                options = question['options'].copy() if isinstance(question['options'], list) else []
            else:
                # If no options are provided, try to use answers instead
                options = question.get('answers', []).copy() if isinstance(question.get('answers', []), list) else []
            
            # Skip if no options available
            if not options:
                print(f"Warning: Skipping multiple choice question with no options: {json.dumps(question)}")
                continue
                
            # Shuffle options
            random.shuffle(options)
            
            # Get the correct answer
            correct_answer = question.get('answer', question.get('correct_answer', options[0]))
            
            html_content += f"""
            <div class="question">
                <p>{question['question']}</p>
                <div class="options">
            """
            
            for option in options:
                html_content += f"<p>{option}</p>"
            
            html_content += f"""
                </div>
                <button class="show-answer-btn" onclick="toggleAnswer('answer{index}')">הצג תשובה</button>
                <p id="answer{index}" class="answer">תשובה נכונה: {correct_answer}</p>
            </div>
            """
    else:
        print("No multiple choice questions found to render")
    
    # Add open-ended questions section if there are any
    open_questions = []
    if 'open_questions' in data:
        open_questions = data['open_questions']
    elif 'exam' in data and 'open_questions' in data['exam']:
        open_questions = data['exam']['open_questions']
    # Also check for open questions in the main 'questions' array
    elif 'questions' in data:
        open_questions = [q for q in data['questions'] if q.get('type') == 'open']
    
    if open_questions:
        html_content += """
            <h2>שאלות פתוחות</h2>
        """
        
        # Add open-ended questions
        for index, question in enumerate(open_questions):
            # Handle different question formats
            if isinstance(question, dict) and 'question' in question:
                question_text = question['question']
                answer_text = question.get('answer', 'See solution guide')
            else:
                # If it's just a string
                question_text = question
                answer_text = 'See solution guide'
            
            html_content += f"""
            <div class="open-question">
                <p>{question_text}</p>
                <button class="show-answer-btn" onclick="toggleAnswer('open-answer{index}')">הצג תשובה</button>
                <p id="open-answer{index}" class="answer-text">{answer_text}</p>
            </div>
            """
    else:
        print("No open questions found to render")
    
    html_content += """
        </div>
    </body>
    </html>
    """
    
    return html_content


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Generate HTML for an exam from a JSON file.")
    
    parser.add_argument(
        "--input-file", "-i",
        required=True,
        help="Path to the input JSON file containing the exam data."
    )
    
    parser.add_argument(
        "--output-file", "-o",
        default="output/exam.html",
        help="Path to the output HTML file (default: 'output/exam.html')."
    )

    return parser.parse_args()


def validate_and_repair_json(data):
    """Validate and repair JSON data structure to ensure it works with the HTML generator"""
    
    # If data is None or empty, create basic structure
    if not data:
        print("Warning: Empty data received, creating minimal structure")
        return {
            "title": "Test Exam",
            "description": "Generated exam",
            "multiple_choice": [],
            "open_questions": []
        }
    
    # Check if we have at least one of the required question structures
    has_questions = False
    
    # Check for questions array
    if 'questions' in data and isinstance(data['questions'], list):
        has_questions = True
        
        # Check each question for required fields
        for i, q in enumerate(data['questions']):
            if not isinstance(q, dict):
                print(f"Warning: Question {i} is not a dictionary, skipping")
                continue
                
            if 'question' not in q:
                print(f"Warning: Question {i} missing 'question' field, adding placeholder")
                q['question'] = f"Question {i+1}"
                
            if 'type' not in q:
                print(f"Warning: Question {i} missing 'type' field, defaulting to 'american'")
                q['type'] = 'american'
                
            if q['type'] == 'american' and ('answers' not in q or not q['answers']):
                print(f"Warning: American question {i} missing 'answers', adding placeholders")
                q['answers'] = ["Option A", "Option B", "Option C", "Option D"]
                
            if q['type'] == 'american' and 'correct_answer' not in q:
                print(f"Warning: American question {i} missing 'correct_answer', setting to first option")
                q['correct_answer'] = q['answers'][0]
    
    # Check for multiple_choice array
    if 'multiple_choice' in data and isinstance(data['multiple_choice'], list):
        has_questions = True
        
        # Check each question for required fields
        for i, q in enumerate(data['multiple_choice']):
            if not isinstance(q, dict):
                print(f"Warning: Multiple choice question {i} is not a dictionary, skipping")
                continue
                
            if 'question' not in q:
                print(f"Warning: Multiple choice question {i} missing 'question' field, adding placeholder")
                q['question'] = f"Question {i+1}"
                
            if 'options' not in q and 'answers' not in q:
                print(f"Warning: Multiple choice question {i} missing options, adding placeholders")
                q['options'] = ["Option A", "Option B", "Option C", "Option D"]
    
    # If data has 'exam' key, validate that too
    if 'exam' in data and isinstance(data['exam'], dict):
        data['exam'] = validate_and_repair_json(data['exam'])
        has_questions = True
    
    # If no valid question structures found, create a minimal structure
    if not has_questions:
        print("Warning: No valid question structures found, creating default question")
        data["questions"] = [
            {
                "question": "Default question",
                "type": "american",
                "answers": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "Option A"
            }
        ]
    
    return data

def main():
    # Parse command-line arguments
    args = parse_arguments()

    # Read the input JSON file
    try:
        with open(args.input_file, "r", encoding="utf-8") as json_file:
            try:
                data = json.load(json_file)
                print(f"Successfully loaded JSON data from {args.input_file}")
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON: {str(e)}")
                print("Attempting to read file contents as text to debug:")
                json_file.seek(0)  # Go back to beginning of file
                content = json_file.read(1000)  # Read first 1000 chars
                print(f"File content preview: {content}")
                
                # Create default data
                data = {
                    "title": "Error Loading Exam",
                    "description": "There was an error loading the exam data.",
                    "questions": [{
                        "question": "Default question due to JSON error",
                        "type": "american",
                        "answers": ["Option A", "Option B", "Option C", "Option D"],
                        "correct_answer": "Option A"
                    }]
                }
    except FileNotFoundError:
        print(f"Error: Input file not found: {args.input_file}")
        return 1
    except Exception as e:
        print(f"Unexpected error reading input file: {str(e)}")
        return 1

    # Validate and repair the data
    data = validate_and_repair_json(data)

    # Generate the HTML
    try:
        html_output = generate_html(data)
        print(f"HTML generation completed, content length: {len(html_output)} characters")
    except Exception as e:
        print(f"Error generating HTML: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1

    # Ensure the output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(args.output_file)), exist_ok=True)

    # Save the output to a file
    try:
        with open(args.output_file, 'w', encoding='utf-8') as f:
            f.write(html_output)
        print(f"HTML file generated successfully: {args.output_file}")
    except Exception as e:
        print(f"Error writing output file: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)