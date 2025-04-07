import argparse
import json
import ast
import re

def detect_direction(text):
    """
    Detects the writing direction based on the content.
    Returns "rtl" if Hebrew characters are present, otherwise "ltr".
    """
    return "rtl" if re.search(r'[\u0590-\u05FF]', text) else "ltr"

def is_probably_code(s):
    """
    Checks if the string appears to be a code snippet.
    This heuristic looks for multi-line content and common code patterns.
    """
    s = s.strip()
    if "\n" in s and (s.startswith("def ") or s.startswith("import ") or s.startswith("class ") or 
                      s.startswith("function ") or ("{" in s and "}" in s) or ";" in s):
        return True
    return False

def format_list_to_html(lst):
    """Recursively formats a list into nested HTML lists."""
    html = "<ul>"
    for item in lst:
        html += f"<li>{format_value(item)}</li>"
    html += "</ul>"
    return html

def format_dict_to_html(data):
    """Recursively formats dictionaries into nested HTML lists."""
    html = "<ul>"
    for key, value in data.items():
        html += f"<li><strong>{key}:</strong> {format_value(value)}</li>"
    html += "</ul>"
    return html

def format_numbered_string(value):
    """
    Splits a string containing numbered list pattern and returns HTML fragments.
    """
    items = re.split(r'\s*(?=\d+\.\s)', value.strip())
    html = ""
    if items and not re.match(r'\d+\.\s', items[0]):
        html += f"<p dir='{detect_direction(items[0])}'>{items[0]}</p>"
        items = items[1:]
    html += "<ul class='numbered-list'>" + "".join(
        f"<li dir='{detect_direction(item)}'>{item}</li>" for item in items if item != ''
    ) + "</ul>"
    return html

def format_value(value):
    """Returns an HTML representation of the value with appropriate language direction."""
    if isinstance(value, dict):
        return format_dict_to_html(value)
    elif isinstance(value, list):
        return format_list_to_html(value)
    elif isinstance(value, str):
        # Handle code blocks first
        if is_probably_code(value):
            return f"<pre><code class=\"code-block\">{value}</code></pre>"
        # Handle numbered lists inside a string
        if re.search(r'\d+\.\s', value):
            return format_numbered_string(value)
        # Handle strings that might be a list represented as text
        stripped = value.strip()
        if stripped.startswith('[') and stripped.endswith(']'):
            try:
                parsed = ast.literal_eval(stripped)
                if isinstance(parsed, list):
                    return format_list_to_html(parsed)
            except Exception:
                pass
        return f"<p dir='{detect_direction(value)}'>{value}</p>"
    else:
        return f"<p dir='{detect_direction(str(value))}'>{str(value)}</p>"

def sanitize_anchor(text):
    """
    Creates a sanitized anchor ID from the given text by replacing spaces and
    special characters with underscores.
    """
    # Remove non-alphanumeric Hebrew/Latin characters except spaces
    anchor = re.sub(r'[^\w\sא-ת]', '', text)
    # Replace spaces with underscores
    anchor = re.sub(r'\s+', '_', anchor)
    return anchor

def json_to_html(json_data, output_file="output/summary.html"):
    if not isinstance(json_data, dict):
        raise ValueError("Input data must be a dictionary")
    
    # Start building HTML content using the sample design
    html_content = """<!DOCTYPE html>
<html lang="he">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JSON to HTML</title>
    <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Assistant', sans-serif;
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #89f7fe, #66a6ff);
            color: #333;
        }
        .container {
            max-width: 900px;
            margin: 40px auto;
            background-color: #fff;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
            direction: rtl;
            text-align: right;
        }
        h2 {
            text-align: center;
            color: #2c3e50;
            background-color: #f0f0f0;
            padding: 12px;
            border-radius: 5px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 20px;
        }
        p {
            font-size: 16px;
            line-height: 1.6;
            text-align: right;
        }
        pre {
            background: #2d2d2d;
            color: #f8f8f8;
            padding: 16px;
            border-radius: 5px;
            overflow-x: auto;
            font-family: 'Courier New', Courier, monospace;
            font-size: 14px;
            line-height: 1.5;
            margin: 20px 0;
            white-space: pre-wrap;
            word-wrap: break-word;
            direction: ltr;
            text-align: left;
        }
        code.code-block {
            display: block;
            padding: 10px;
        }
        ul {
            list-style-type: disc;
            padding-right: 20px;
            margin-bottom: 20px;
        }
        li {
            background: #ecf0f1;
            color: #34495e;
            margin: 5px 0;
            padding: 10px;
            border-radius: 5px;
            text-align: right;
        }
        nav {
            background: #f7f7f7;
            padding: 20px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        nav ul {
            list-style-type: none;
            padding: 0;
        }
        nav li {
            margin: 5px 0;
        }
        nav a {
            text-decoration: none;
            color: #2980b9;
        }
    </style>
</head>
<body>
    <a id="top"></a>
    <div class="container">
"""
    # Build table of contents using the JSON keys as section titles.
    toc = "<nav><h2>תוכן העניינים</h2><ul>"
    sections = ""
    for key, value in json_data.items():
        anchor = sanitize_anchor(key)
        toc += f"<li><a href='#{anchor}'>{key}</a></li>"
        # Create section content with a 'back to top' link.
        section_html = f"<section id='{anchor}'>"
        section_html += f"<h2>{key}</h2>"
        section_html += format_value(value)
        section_html += "<p style=\"text-align:left;\"><a href=\"#top\">חזרה למעלה</a></p>"
        section_html += "</section>"
        sections += section_html
    toc += "</ul></nav>"
    
    html_content += toc + sections
    html_content += "</div></body></html>"
    
    with open(output_file, "w", encoding="utf-8") as file:
        file.write(html_content)
    
    print(f"HTML file '{output_file}' generated successfully.")

def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Convert JSON data to an HTML file with a custom summary layout.")
    
    parser.add_argument(
        "--input-file", "-i",
        required=True,
        help="Path to the input JSON file."
    )
    
    parser.add_argument(
        "--output-file", "-o",
        default="output/summary.html",
        help="Path to the output HTML file (default: 'output/summary.html')."
    )

    return parser.parse_args()

def main():
    # Parse command-line arguments
    args = parse_arguments()

    # Read the input JSON file
    with open(args.input_file, "r", encoding="utf-8") as json_file:
        data = json.load(json_file)

    # Convert the JSON data to HTML and save to the output file
    json_to_html(data, output_file=args.output_file)

if __name__ == "__main__":
    main()