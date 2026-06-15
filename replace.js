const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('web/src/app/api/deals');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/import\s+\{\s*mockStore\s*\}\s+from\s+'@\/lib\/db\/mock-store';/g, "import { repository } from '@/lib/repositories';");
  content = content.replace(/mockStore\.deals\.get\((.*?)\)/g, "await repository.getDeal($1)");
  content = content.replace(/mockStore\.updateDeal\((.*?),\s*(.*?)\)/g, "await repository.updateDeal($1, $2)");
  content = content.replace(/mockStore\.addEvent\((.*?)\)/g, "await repository.addEvent($1)");
  content = content.replace(/mockStore\.addEvidence\((.*?)\)/g, "await repository.addEvidence($1)");
  content = content.replace(/processReputationOutcome\(mockStore,/g, "await processReputationOutcome(repository,");
  fs.writeFileSync(file, content, 'utf8');
});

const demoReset = 'web/src/app/api/demo/reset/route.ts';
if (fs.existsSync(demoReset)) {
  let content = fs.readFileSync(demoReset, 'utf8');
  content = content.replace(/import\s+\{\s*mockStore\s*\}\s+from\s+'@\/lib\/db\/mock-store';/g, "import { mockStore } from '@/lib/db/mock-store'; // Keeping for demo reset");
  fs.writeFileSync(demoReset, content, 'utf8');
}
