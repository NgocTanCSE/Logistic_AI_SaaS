import os
import re

app_dir = "apps/tenant-portal/src/app"

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    changed = False
    new_content = content
    
    # We will look for <Button...> and <button...>
    # that DO NOT have onClick and DO NOT have type="submit" and are NOT disabled
    
    def replacer(match):
        tag_open = match.group(1)
        tag_close = match.group(2)
        # Check if it has onClick
        if 'onClick=' in tag_open or 'type="submit"' in tag_open:
            return match.group(0) # Do nothing
        
        # Insert onClick
        new_tag_open = tag_open.rstrip('>') + " onClick={() => alert('Tính năng này đang được phát triển và sẽ có mặt trong bản cập nhật tới!')}>"
        return new_tag_open + tag_close

    # Use a non-greedy regex to match the opening tag of Button or button, and then capture what's inside
    # Match <Button ... >
    pattern1 = r'(<Button([^>]*)>)'
    
    def replacer1(match):
        full_tag = match.group(1)
        if 'onClick=' in full_tag or 'type="submit"' in full_tag:
            return full_tag
        return full_tag.rstrip('/>').rstrip('>') + " onClick={() => alert('Tính năng này đang được phát triển và sẽ có mặt trong bản cập nhật tới!')}>"
        
    updated1, count1 = re.subn(pattern1, replacer1, new_content)
    if count1 > 0 and updated1 != new_content:
        new_content = updated1
        changed = True

    pattern2 = r'(<button([^>]*)>)'
    def replacer2(match):
        full_tag = match.group(1)
        if 'onClick=' in full_tag or 'type="submit"' in full_tag:
            return full_tag
        return full_tag.rstrip('/>').rstrip('>') + " onClick={() => alert('Tính năng này đang được phát triển và sẽ có mặt trong bản cập nhật tới!')}>"
        
    updated2, count2 = re.subn(pattern2, replacer2, new_content)
    if count2 > 0 and updated2 != new_content:
        new_content = updated2
        changed = True

    if changed:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated: {filepath}")

for root, _, files in os.walk(app_dir):
    for file in files:
        if file.endswith('.tsx'):
            process_file(os.path.join(root, file))

print("Done.")
