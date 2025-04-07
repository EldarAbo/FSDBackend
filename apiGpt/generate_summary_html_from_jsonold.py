import argparse
import json
import ast
import re

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
    If the string contains a numbered list pattern (e.g., "1. ... 2. ..."),
    split the string and return an HTML fragment with a paragraph for any text
    before the list and a proper HTML list for the numbered items.
    """
    items = re.split(r'\s*(?=\d+\.\s)', value.strip())
    if len(items) <= 1:
        return value
    html = ""
    if not re.match(r'\d+\.\s', items[0]):
        html += f"<p>{items[0]}</p>"
        items = items[1:]
    html += "<ul>" + "".join(f"<li>{item}</li>" for item in items if item != '') + "</ul>"
    return html

def format_value(value):
    """Returns an HTML representation of the value."""
    if isinstance(value, dict):
        return format_dict_to_html(value)
    elif isinstance(value, list):
        return format_list_to_html(value)
    elif isinstance(value, str):
        if re.search(r'\d+\.\s', value):
            return format_numbered_string(value)
        stripped = value.strip()
        if stripped.startswith('[') and stripped.endswith(']'):
            try:
                parsed = ast.literal_eval(stripped)
                if isinstance(parsed, list):
                    return format_list_to_html(parsed)
            except Exception:
                pass
        return value
    else:
        return str(value)

def json_to_html(json_data, output_file="output/summary.html"):
    if not isinstance(json_data, dict):
        raise ValueError("Input data must be a dictionary")
    
    html_content = """
    <!DOCTYPE html>
    <html lang="he" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>JSON to HTML</title>
        <link href="https://fonts.googleapis.com/css2?family=Assistant:wght@400;600&display=swap" rel="stylesheet">
        <style>
            body {
                font-family: 'Assistant', sans-serif;
                direction: rtl;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #89f7fe, #66a6ff);
                color: #333;
                text-align: right;
            }
            .container {
                max-width: 900px;
                margin: 40px auto;
                background-color: #fff;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
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
            }
            pre {
                background: #2d2d2d;
                color: #f8f8f8;
                padding: 12px;
                border-radius: 5px;
                overflow-x: auto;
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
            }
        </style>
    </head>
    <body>
        <div class="container">
    """
    
    for key, value in json_data.items():
        html_content += f"<h2>{key}</h2>"
        formatted_value = format_value(value)
        if formatted_value.strip().startswith("<ul>"):
            html_content += formatted_value
        else:
            html_content += f"<p>{formatted_value}</p>"
    
    html_content += "</div></body></html>"
    
    with open(output_file, "w", encoding="utf-8") as file:
        file.write(html_content)
    
    print(f"HTML file '{output_file}' generated successfully.")

def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Convert JSON data to an HTML file.")
    
    parser.add_argument(
        "--input-file", "-i",
        required=True,
        help="Path to the input JSON file."
    )
    
    parser.add_argument(
        "--output-file", "-o",
        default="output/summary.html",
        help="Path to the output HTML file (default: 'output/summary1.html')."
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