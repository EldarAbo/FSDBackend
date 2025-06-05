import argparse
import json
import ast
import re
import os
import sys

def detect_direction(text):
    return "rtl" if re.search(r'[\u0590-\u05FF]', text) else "ltr"

def is_probably_code(s):
    s = s.strip()
    return (
        "\n" in s and (
            s.startswith(("def ", "import ", "class ", "function ")) or 
            ("{" in s and "}" in s) or 
            ";" in s
        )
    )

def format_list_to_html(lst):
    html = "<ul>"
    for item in lst:
        html += f"<li>{format_value(item)}</li>"
    html += "</ul>"
    return html

def format_dict_to_html(data):
    html = "<ul>"
    for key, value in data.items():
        html += f"<li><strong>{key}:</strong> {format_value(value)}</li>"
    html += "</ul>"
    return html

def format_numbered_string(value):
    items = re.split(r'\s*(?=\d+\.\s)', value.strip())
    html = ""
    if items and not re.match(r'\d+\.\s', items[0]):
        html += f"<p dir='{detect_direction(items[0])}'>{items[0]}</p>"
        items = items[1:]
    html += "<ol class='numbered-list'>" + "".join(
        f"<li dir='{detect_direction(item)}'>{item}</li>" for item in items if item
    ) + "</ol>"
    return html

def format_value(value):
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False, indent=2)

    elif not isinstance(value, str):
        value = str(value)

    value = value.strip()
    if is_probably_code(value):
        return f"<pre><code class=\"code-block\">{value}</code></pre>"
    
    return f"<p dir='{detect_direction(value)}'>{value}</p>"


def sanitize_anchor(text):
    anchor = re.sub(r'[^\w\sא-ת]', '', text)
    anchor = re.sub(r'\s+', '_', anchor)
    return anchor

def json_to_html(json_data, output_file="output/summary.html"):
    if not isinstance(json_data, dict):
        raise ValueError("Input data must be a dictionary")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    html_content = """<!DOCTYPE html>
<html lang="he">
<head>
   <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>סיכום</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;700&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Assistant', sans-serif;
            background-color: #faf7fc;
            margin: 0;
            padding: 0;
            color: #2c2c2c;
            direction: rtl;
        }
        .container {
            max-width: 1000px;
            margin: 40px auto;
            padding: 30px;
        }
        h2 {
            background-color: #8c4ca8;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            background: white;
            padding: 10px 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 12px;
        }
        nav {
            background-color: #ffffff;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        nav h2 {
            background: none;
            color: #8c4ca8;
            padding: 0;
            margin-bottom: 10px;
        }
        nav ul {
            list-style: none;
            padding-right: 0;
        }
        nav li {
            margin: 5px 0;
        }
        nav a {
            color: #ab7cc3;
            text-decoration: none;
            font-weight: bold;
        }
        nav a:hover {
            text-decoration: underline;
        }
        pre {
            background-color: #eee;
            padding: 15px;
            border-radius: 6px;
            overflow-x: auto;
            direction: ltr;
            text-align: left;
            font-size: 14px;
        }
        li {
            background: #F0EAF6;
            color: #ab7cc3;
            margin: 4px 0;
            padding: 10px;
            border-radius: 4px;
        }

        li *:last-child {
            margin-bottom: 0;
        }
        
        li *:first-child {
            margin-top: 0;
        }

        a.top-link {
            display: inline-block;
            margin-top: 10px;
            font-size: 14px;
            color: #ab7cc3;
            text-decoration: none;
        }
        section {
            background-color: #f6edf9;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 40px;
            box-shadow: 0 2px 8px rgba(140, 76, 168, 0.1);
        }

    </style>
</head>
<body>
    <a id="top"></a>
    <div class="container">
"""

    toc = "<nav><h2>תוכן העניינים</h2><ul>"
    sections = ""
    for key, value in json_data.items():
        anchor = sanitize_anchor(key)
        toc += f"<li><a href='#{anchor}'>{key}</a></li>"
        section_html = f"<section id='{anchor}'><h2>{key}</h2>{format_value(value)}"
        section_html += "<p style=\"text-align:left;\"><a href=\"#top\">חזרה למעלה</a></p></section>"
        sections += section_html
    toc += "</ul></nav>"

    html_content += toc + sections + "</div></body></html>"

    with open(output_file, "w", encoding="utf-8") as file:
        file.write(html_content)

    print(f"HTML file '{output_file}' generated successfully.")

def parse_arguments():
    parser = argparse.ArgumentParser(description="Convert JSON to styled HTML.")
    parser.add_argument("--input-file", "-i", required=True, help="Input JSON file path")
    parser.add_argument("--output-file", "-o", default="output/summary.html", help="Output HTML file path")
    return parser.parse_args()

def main():
    args = parse_arguments()
    try:
        with open(args.input_file, "r", encoding="utf-8") as json_file:
            data = json.load(json_file)
        json_to_html(data, output_file=args.output_file)
    except FileNotFoundError:
        print(f"שגיאה: הקובץ '{args.input_file}' לא נמצא.")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"שגיאה: הקובץ אינו בפורמט JSON תקין - {e}")
        sys.exit(1)
    except Exception as e:
        print(f"שגיאה לא צפויה: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
