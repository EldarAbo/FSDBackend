import json,os

# Your JSON data
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
            },
            {
                "question": "מהו חסרון של אלגוריתם KNN?",
                "options": [
                    "א. אינו מחשב מודל למידה בשלב האימון",
                    "ב. זמן הסיווג ארוך",
                    "ג. שניהם נכונים",
                    "ד. אינו ניתן ליישום"
                ],
                "answer": "ג"
            },
            {
                "question": "מהי מטרתו של אלגוריתם SVM?",
                "options": [
                    "א. למצוא את המרווח המקסימלי בין הקבוצות",
                    "ב. למנוע בעיית overfitting",
                    "ג. לבצע ניתוח נומינלי",
                    "ד. לזהות קצוות של גרפים"
                ],
                "answer": "א"
            },
            {
                "question": "איזה פרמטר משפיע על ביצועי אלגוריתם KNN?",
                "options": [
                    "א. מספר השכנים K",
                    "ב. מרחק נורמלי",
                    "ג. שניהם נכונים",
                    "ד. אף תשובה אינה נכונה"
                ],
                "answer": "ג"
            },
            {
                "question": "כיצד ניתן לזהות בעיית overfitting?",
                "options": [
                    "א. כאשר המודל משיג ביצועים טובים באימון ונמוכים במבחן",
                    "ב. כאשר המודל מסווג נתונים אקראיים בהצלחה",
                    "ג. כאשר האלגוריתם נבחר בצורה לא נכונה",
                    "ד. כאשר המשתנים התלויים אינם בקורלציה עם הקלט"
                ],
                "answer": "א"
            },
            {
                "question": "מה היתרון של Naïve Bayes?",
                "options": [
                    "א. פשטות ומהירות",
                    "ב. דורש דאטה מסומן רב",
                    "ג. רגישות גבוהה לרעש",
                    "ד. אינו ניתן לשימוש בדאטה חסר"
                ],
                "answer": "א"
            },
            {
                "question": "מה היתרון של שימוש ב- Cross-Validation?",
                "options": [
                    "א. משפר ביצועים על ידי שימוש בכל הדאטה לאימון ובדיקה",
                    "ב. מצמצם את הצורך בדאטה מסומן",
                    "ג. מגדיל את הדיוק של המודל מבלי לשנות היפרפרמטרים",
                    "ד. לא משפיע על ביצועי המודל"
                ],
                "answer": "א"
            },
            {
                "question": "מהו תפקיד פונקציית האקטיבציה ברשתות נוירונים?",
                "options": [
                    "א. הוספת אי-לינאריות למודל",
                    "ב. שיפור המהירות של הלמידה",
                    "ג. הפחתת השגיאה של המודל",
                    "ד. סינון נתונים לא חשובים"
                ],
                "answer": "א"
            }
        ],
        "open_questions": [
            {
                "question": "הסבר את ההבדל בין SVM לאלגוריתם פרספטרון.",
                "answer": "SVM משפר את ההכללה של המודל על ידי בחירת hyperplane עם המרווח המקסימלי, בעוד שפרספטרון עובד עם עדכון פשוט של משקולות."
            },
            {
                "question": "מהו היתרון של שימוש ב- Cross-Validation?",
                "answer": "מאפשר הערכה טובה יותר של הביצועים של מודל על ידי חלוקה של הדאטה לכמה קבוצות ולמנוע overfitting."
            },
            {
                "question": "כיצד ניתן לזהות בעיית overfitting?",
                "answer": "כאשר המודל משיג ביצועים גבוהים על קבוצת האימון אך ביצועים נמוכים על קבוצת המבחן."
            }
        ]
    }
}

# Function to generate HTML
def generate_html(data):
    html_content = """
    <!DOCTYPE html>
    <html lang="he">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>מבחן</title>
        <style>
            body {
                font-family: 'Arial', sans-serif;
                direction: rtl;
                margin: 0;
                padding: 0;
                background-color: #f4f4f4;
                color: #333;
            }
            h1, h2 {
                text-align: center;
                color: #2c3e50;
            }
            .container {
                width: 80%;
                margin: 0 auto;
                padding: 20px;
                background-color: #fff;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            }
            .question {
                margin-bottom: 20px;
                padding: 10px;
                background-color: #ecf0f1;
                border-radius: 5px;
            }
            .question p {
                font-size: 18px;
                margin: 5px 0;
            }
            .options {
                margin-left: 20px;
                font-size: 16px;
            }
            .options p {
                margin-bottom: 5px;
            }
            .answer {
                font-weight: bold;
                color: #27ae60;
                display: none;
            }
            .open-question {
                padding: 15px;
                background-color: #f8f9fa;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .open-question p {
                font-size: 18px;
            }
            .answer-text {
                font-size: 16px;
                color: #34495e;
                margin-top: 10px;
                display: none;
            }
            .show-answer-btn {
                margin-top: 10px;
                padding: 5px 10px;
                background-color: #2980b9;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            .show-answer-btn:hover {
                background-color: #3498db;
            }
        </style>
        <script>
            function toggleAnswer(id) {
                var answer = document.getElementById(id);
                if (answer.style.display === "none") {
                    answer.style.display = "block";
                } else {
                    answer.style.display = "none";
                }
            }
        </script>
    </head>
    <body>

    <div class="container">
        <h1>מבחן</h1>

        <h2>שאלות רב-ברירה</h2>
    """
    
    # Add multiple choice questions
    for index, question in enumerate(data['exam']['multiple_choice']):
        html_content += f"""
        <div class="question">
            <p>{question['question']}</p>
            <div class="options">
        """
        for option in question['options']:
            html_content += f"<p>{option}</p>"
        
        html_content += f"""
            </div>
            <button class="show-answer-btn" onclick="toggleAnswer('answer{index}')">הצג תשובה</button>
            <p id="answer{index}" class="answer">תשובה נכונה: {question['answer']}</p>
        </div>
        """

    html_content += """
        <h2>שאלות פתוחות</h2>
    """

    # Add open-ended questions
    for index, question in enumerate(data['exam']['open_questions']):
        html_content += f"""
        <div class="open-question">
            <p>{question['question']}</p>
            <button class="show-answer-btn" onclick="toggleAnswer('open-answer{index}')">הצג תשובה</button>
            <p id="open-answer{index}" class="answer-text">{question['answer']}</p>
        </div>
        """

    html_content += """
    </div>

    </body>
    </html>
    """
    
    return html_content

script_dir = os.path.dirname(os.path.abspath(__file__))
json_path = os.path.join(script_dir, 'response.json')

with open(json_path, "r", encoding="utf-8") as json_file:
    data = json.load(json_file)

# Generate the HTML
html_output = generate_html(data)

json_path_html = os.path.join(script_dir, 'exam1.html')
# Save the output to a file
with open(json_path_html, 'w', encoding='utf-8') as f:
    f.write(html_output)

#TODO: add files from folder
#TODO: CHATGPT PROMPT
#TODO: CHATGPT API

print("HTML file generated successfully: exam.html")