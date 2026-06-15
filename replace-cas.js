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
  content = content.replace(
    /await repository\.updateDeal\(dealId, updatedDeal\);/g, 
    "const { replaced } = await repository.replaceDealIfCurrent({ current: existingDeal, next: updatedDeal });\n    if (!replaced) return NextResponse.json(createErrorResponse('CONFLICT', 'Concurrent update'), { status: 409 });"
  );
  fs.writeFileSync(file, content, 'utf8');
});
