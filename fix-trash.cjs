const fs = require('fs');
['CartPage.jsx', 'WishlistPage.jsx'].forEach(file => {
  const p = 'src/views/' + file;
  let code = fs.readFileSync(p, 'utf8');
  code = code.replace(/import \{([^}]+)\} from [\'\"]lucide-react['\"]/, (match, p1) => {
    if (!p1.includes('Trash')) {
      return `import { ${p1}, Trash } from "lucide-react"`;
    }
    return match;
  });
  fs.writeFileSync(p, code);
  console.log('Fixed', file);
});
