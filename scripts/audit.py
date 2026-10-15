import os
import re

app_dir = r"apps\tenant-portal\src\app"

pages = []
for root, _, files in os.walk(app_dir):
    for f in files:
        if f == "page.tsx":
            pages.append(os.path.join(root, f))

report = []

for page in pages:
    with open(page, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract buttons
    buttons = re.findall(r'<[Bb]utton[^>]*>(.*?)</[Bb]utton>', content, re.DOTALL | re.IGNORECASE)
    
    # Also extract inputs that might be actions like search
    has_search = 'placeholder="Search' in content or 'Search by' in content
    
    clean_buttons = []
    for b in buttons:
        # Clean up tags inside button (like svg)
        text = re.sub(r'<[^>]+>', '', b).strip()
        if text:
            # Check if it has our mock alert
            clean_buttons.append(text)
        elif 'svg' in b.lower():
            clean_buttons.append("Icon Button (Edit/Delete/Action)")
    
    # Check if there are modals
    has_modal = 'isModalOpen' in content or 'setIsModalOpen' in content
    
    # Look for table headers to infer entity columns
    headers = re.findall(r'<th[^>]*>(.*?)</th>', content, re.DOTALL | re.IGNORECASE)
    clean_headers = [re.sub(r'<[^>]+>', '', h).strip() for h in headers]
    clean_headers = [h for h in clean_headers if h]
    
    if clean_buttons or has_search or has_modal:
        rel_path = page.replace(app_dir + "\\", "").replace("\\page.tsx", "")
        if rel_path == "page.tsx" or rel_path == "apps\\tenant-portal\\src\\app\\page.tsx": rel_path = "Home"
        
        report.append(f"### {rel_path}")
        if clean_headers:
            report.append(f"- **Data Columns:** {', '.join(clean_headers)}")
        report.append(f"- **Detected Buttons:** {', '.join(clean_buttons)}")
        report.append(f"- **Has Search/Filter:** {has_search}")
        report.append(f"- **Has Form/Modal:** {has_modal}")
        report.append("")

with open("button_audit.md", "w", encoding="utf-8") as f:
    f.write("\n".join(report))
print("Audit generated at button_audit.md")
