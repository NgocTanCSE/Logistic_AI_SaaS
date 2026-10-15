import re

path = 'packages/prisma-schemas/prisma/schema.prisma'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 0. Normalize line endings to LF (Docker/Linux) to avoid regex mismatches
content = content.replace('\r\n', '\n')

# 1. Chuyển đổi Database Provider sang SQLite
content = re.sub(r'provider\s*=\s*"postgresql"', 'provider = "sqlite"', content)

# 2. Array String (String[]) -> String (SQLite không hỗ trợ mảng)
# Schema hiện tại có 2 field String[]: TenantApiKey.scopes, ClientApiKey.scopes
# Sau convert thành String, seed phải dùng JSON.stringify() thay vì array literal
content = re.sub(r'String\[\]', 'String', content)

# 3. Chuyển đổi các kiểu dữ liệu đặc thù (forward-compatible)
# JSON -> String (Prisma SQLite không hỗ trợ Json, cần String + JSON.stringify)
# Schema hiện tại không dùng Json type, giữ regex để forward-compatible
content = re.sub(r'\bJson\b', 'String', content)

# Unsupported("geometry") -> String (PostGIS geometry, forward-compatible)
content = re.sub(r'Unsupported\("geometry"\)\?', 'String?', content)
content = re.sub(r'Unsupported\("geometry"\)', 'String', content)

# 5. Fix các giá trị mặc định cho JSON/String
content = re.sub(r'@default\("{}"\)', '@default("{}")', content)
content = re.sub(r"@default\('{}'\)", '@default("{}")', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

# 6. Patch seed.ts và seed-lite.ts cho SQLite (chuyển Object thành String)
for seed_file in ['packages/prisma-schemas/prisma/seed.ts', 'packages/prisma-schemas/prisma/seed-lite.ts']:
    try:
        with open(seed_file, 'r', encoding='utf-8') as f:
            seed_content = f.read()
        seed_content = re.sub(r'featuresJson:\s*({[^}]+})', r'featuresJson: JSON.stringify(\1)', seed_content)
        seed_content = re.sub(r'scopes:\s*\[([^\]]+)\]', r'scopes: JSON.stringify([\1])', seed_content)
        with open(seed_file, 'w', encoding='utf-8') as f:
            f.write(seed_content)
        print(f"[OK] Patched {seed_file} for SQLite")
    except Exception as e:
        print(f"[WARN] Could not patch {seed_file}: {e}")

# 7. Kiểm tra các kiểu SQLite-unsupported còn sót lại sau conversion
remaining_issues = []
for i, line in enumerate(content.split('\n'), 1):
    stripped = line.strip()
    if stripped.startswith('#'):
        continue
    if 'Json' in stripped and 'json' not in stripped.lower():
        remaining_issues.append(f"  Line {i}: Json type detected — {stripped}")
    if 'String[]' in stripped:
        remaining_issues.append(f"  Line {i}: String[] array type — {stripped}")
    if 'Unsupported' in stripped:
        remaining_issues.append(f"  Line {i}: Unsupported type — {stripped}")

if remaining_issues:
    print("[WARN] SQLite-unsupported types remaining after conversion:")
    for issue in remaining_issues:
        print(issue)
else:
    print("[OK] No SQLite-unsupported types remaining after conversion")

print("[OK] Converted schema to SQLite successfully")
