const fs = require('fs');
const path = require('path');

const emojisToStrip = ['', '', '', '', '', '', '', ''];

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === '.next') continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkAndReplace(fullPath);
        } else if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.py') || file.endsWith('.sh') || file.endsWith('.tsx')) {
            try {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;
                for (const emoji of emojisToStrip) {
                    if (content.includes(emoji)) {
                        content = content.split(emoji).join('');
                        changed = true;
                    }
                }
                if (changed) {
                    fs.writeFileSync(fullPath, content, 'utf8');
                    console.log(`Removed emojis from ${fullPath}`);
                }
            } catch (e) {
                // Ignore binary files or read errors
            }
        }
    }
}

walkAndReplace(__dirname);
console.log('Done.');
