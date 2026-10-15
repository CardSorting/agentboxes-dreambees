#!/usr/bin/env python3
import sys
import os
import subprocess
import re
import html

def markdown_to_html(md_text):
    # Escape basic HTML entities in text
    lines = md_text.split('\n')
    html_lines = []
    in_code_block = False
    code_lang = ""
    code_content = []
    in_table = False
    table_rows = []

    for line in lines:
        if line.startswith('```'):
            if in_code_block:
                in_code_block = False
                escaped_code = html.escape('\n'.join(code_content))
                html_lines.append(f'<pre class="code-block"><code class="language-{code_lang}">{escaped_code}</code></pre>')
                code_content = []
            else:
                in_code_block = True
                code_lang = line[3:].strip()
            continue

        if in_code_block:
            code_content.append(line)
            continue

        # Tables
        if line.strip().startswith('|') and line.strip().endswith('|'):
            cells = [c.strip() for c in line.strip()[1:-1].split('|')]
            if all(set(c).issubset({'-', ':', ' '}) for c in cells):
                continue # delimiter row
            is_header = not in_table
            in_table = True
            tag = 'th' if is_header else 'td'
            row_html = '<tr>' + ''.join(f'<{tag}>{format_inline(c)}</{tag}>' for c in cells) + '</tr>'
            table_rows.append(row_html)
            continue
        elif in_table:
            in_table = False
            html_lines.append('<table class="data-table"><tbody>' + ''.join(table_rows) + '</tbody></table>')
            table_rows = []

        # Headers
        header_match = re.match(r'^(#{1,6})\s+(.*)$', line)
        if header_match:
            level = len(header_match.group(1))
            title = format_inline(header_match.group(2))
            html_lines.append(f'<h{level}>{title}</h{level}>')
            continue

        # Horizontal rule
        if line.strip() in ['---', '***', '___']:
            html_lines.append('<hr/>')
            continue

        # Blockquotes
        if line.startswith('> '):
            quote_text = format_inline(line[2:])
            html_lines.append(f'<blockquote>{quote_text}</blockquote>')
            continue

        # Unordered list
        if re.match(r'^[\*\-]\s+', line):
            item_text = format_inline(re.sub(r'^[\*\-]\s+', '', line))
            html_lines.append(f'<ul><li>{item_text}</li></ul>')
            continue

        # Ordered list
        ol_match = re.match(r'^\d+\.\s+(.*)$', line)
        if ol_match:
            item_text = format_inline(ol_match.group(1))
            html_lines.append(f'<ol><li>{item_text}</li></ol>')
            continue

        # Empty line
        if not line.strip():
            continue

        # Paragraph
        html_lines.append(f'<p>{format_inline(line)}</p>')

    if in_table:
        html_lines.append('<table class="data-table"><tbody>' + ''.join(table_rows) + '</tbody></table>')

    return '\n'.join(html_lines)

def format_inline(text):
    # Bold & Italic
    text = re.sub(r'\*\*\*(.*?)\*\*\*', r'<strong><em>\1</em></strong>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.*?)\*', r'<em>\1</em>', text)
    # Inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # Links
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text

def build_pdf(md_path, pdf_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        md_content = f.read()

    body_html = markdown_to_html(md_content)
    title = os.path.basename(md_path).replace('.md', '').replace('_', ' ')

    full_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<style>
  @page {{
    size: letter;
    margin: 20mm 18mm 20mm 18mm;
    @bottom-center {{
      content: counter(page);
    }}
  }}
  body {{
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.5;
    color: #1a1a1a;
    background: #fff;
  }}
  h1 {{
    font-size: 18pt;
    font-weight: 700;
    margin-top: 0;
    margin-bottom: 6pt;
    color: #0f172a;
    border-bottom: 2pt solid #0284c7;
    padding-bottom: 4pt;
  }}
  h2 {{
    font-size: 13pt;
    font-weight: 600;
    margin-top: 14pt;
    margin-bottom: 4pt;
    color: #1e293b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 2pt;
    page-break-after: avoid;
  }}
  h3 {{
    font-size: 11pt;
    font-weight: 600;
    margin-top: 10pt;
    margin-bottom: 3pt;
    color: #334155;
    page-break-after: avoid;
  }}
  p {{
    margin: 0 0 6pt 0;
    text-align: justify;
  }}
  hr {{
    border: none;
    border-top: 1px solid #cbd5e1;
    margin: 10pt 0;
  }}
  pre.code-block {{
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 6pt 8pt;
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 8pt;
    line-height: 1.35;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 6pt 0;
    page-break-inside: avoid;
  }}
  code {{
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
    font-size: 8.5pt;
    background: #f1f5f9;
    padding: 1pt 3pt;
    border-radius: 3pt;
    color: #0f172a;
  }}
  blockquote {{
    border-left: 3pt solid #0284c7;
    margin: 6pt 0;
    padding: 4pt 10pt;
    background: #f0f9ff;
    color: #0369a1;
    font-style: italic;
    page-break-inside: avoid;
  }}
  table.data-table {{
    width: 100%;
    border-collapse: collapse;
    margin: 8pt 0;
    font-size: 8.5pt;
    page-break-inside: avoid;
  }}
  table.data-table th, table.data-table td {{
    border: 1px solid #cbd5e1;
    padding: 4pt 6pt;
    text-align: left;
  }}
  table.data-table th {{
    background: #f1f5f9;
    font-weight: 600;
    color: #1e293b;
  }}
  table.data-table tr:nth-child(even) {{
    background: #f8fafc;
  }}
  ul, ol {{
    margin: 0 0 6pt 16pt;
    padding: 0;
  }}
  li {{
    margin-bottom: 2pt;
  }}
  a {{
    color: #0284c7;
    text-decoration: none;
  }}
</style>
</head>
<body>
{body_html}
</body>
</html>
"""

    temp_html = pdf_path.replace('.pdf', '.tmp.html')
    with open(temp_html, 'w', encoding='utf-8') as f:
        f.write(full_html)

    chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    cmd = [
        chrome_bin,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        temp_html
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(temp_html):
        os.remove(temp_html)

    if res.returncode == 0 and os.path.exists(pdf_path):
        size = os.path.getsize(pdf_path)
        print(f"Generated {pdf_path} ({size} bytes)")
    else:
        print(f"Error generating PDF: {res.stderr.decode()}")
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: build_pdf.py <input.md> <output.pdf>")
        sys.exit(1)
    build_pdf(sys.argv[1], sys.argv[2])
