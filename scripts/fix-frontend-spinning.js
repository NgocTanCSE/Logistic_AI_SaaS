const fs = require('fs');
const glob = require('glob');

const files = glob.sync('apps/tenant-portal/src/app/**/*.tsx');

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace `useEffect(() => { fetchSomething(); }, []);`
  // with `useEffect(() => { if (token) fetchSomething(); }, [token]);`
  
  // This Regex looks for useEffect with empty deps that calls a fetch function
  // We'll do it a bit safer: find `}, []);` and if the file has `if (!token) return`, we'll change it.
  
  if (content.includes('if (!token) return;') || content.includes('if(!token) return;')) {
    // Some files have `useEffect(() => { fetchRoles(); }, []);`
    // Let's replace `}, []);` with `}, [token]);` ONLY for the useEffects calling fetch...
    // Actually, simply replacing `}, []);` with `}, [token]);` is usually safe for data fetching hooks if token is the only missing dependency.
    // Wait, replacing ALL `}, []);` might break other things. Let's be precise.
    
    // Replace `useEffect(() => { fetch` with `useEffect(() => { if(token) fetch`
    content = content.replace(/useEffect\(\(\)\s*=>\s*\{\s*(fetch[A-Za-z]+)\(\);\s*\}\s*,\s*\[\]\);/g, 
      'useEffect(() => { if (token) $1(); }, [token]);');
  }

  // Also fix the AI insights toLocaleString bug
  if (file.includes('ai-insights')) {
    content = content.replace(/new Date\(fb\.createdAt\)\.toLocaleString\(\)/g, "fb.createdAt ? new Date(fb.createdAt).toLocaleString() : 'N/A'");
  }

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Fixed spinning/errors in ' + file);
  }
}
