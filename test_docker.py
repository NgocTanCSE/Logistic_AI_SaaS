import re
with open('/data/schema.prisma', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('\r\n', '\n')
content = re.sub(r'^[ \t]*@@schema\("[^"]+"\)[ \t]*\n?', '', content, flags=re.MULTILINE)
print("@@schema" in content)
