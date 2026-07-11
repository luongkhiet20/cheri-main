const fs = require('fs');
const path = require('path');

function checkFile(file) {
  const code = fs.readFileSync(file, 'utf8');
  
  // Find all used components
  const tags = [...code.matchAll(/<([A-Z][a-zA-Z]*)/g)].map(m => m[1]);
  const usedTags = [...new Set(tags)];
  
  const allImports = code.match(/import\s+[^;]+;/g) || [];
  let importedNames = [];
  
  allImports.forEach(imp => {
    const braceMatch = imp.match(/\{([^}]+)\}/);
    if (braceMatch) {
      importedNames.push(...braceMatch[1].split(',').map(s => s.trim().split(' as ')[0]));
    }
    const defaultMatch = imp.match(/import\s+([A-Za-z0-9_]+)\s+from/);
    if (defaultMatch) {
      importedNames.push(defaultMatch[1].trim());
    }
  });

  const missing = usedTags.filter(tag => !importedNames.includes(tag));
  if (missing.length > 0) {
     console.log(file, 'Missing imports:', missing.join(', '));
  }
}

const dir = 'src/views';
fs.readdirSync(dir).forEach(file => {
  if (file.endsWith('.jsx')) checkFile(path.join(dir, file));
});

const appCode = fs.readFileSync('src/App.jsx', 'utf8');
const tags = [...appCode.matchAll(/<([A-Z][a-zA-Z]*)/g)].map(m => m[1]);
const usedTags = [...new Set(tags)];
const allImports = appCode.match(/import\s+[^;]+;/g) || [];
let importedNames = [];
allImports.forEach(imp => {
  const braceMatch = imp.match(/\{([^}]+)\}/);
  if (braceMatch) {
    importedNames.push(...braceMatch[1].split(',').map(s => s.trim().split(' as ')[0]));
  }
  const defaultMatch = imp.match(/import\s+([A-Za-z0-9_]+)\s+from/);
  if (defaultMatch) {
    importedNames.push(defaultMatch[1].trim());
  }
});
const missing = usedTags.filter(tag => !importedNames.includes(tag));
if (missing.length > 0) {
   console.log('src/App.jsx Missing imports:', missing.join(', '));
}
