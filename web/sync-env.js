const { execSync } = require('child_process');
const fs = require('fs');
const lines = fs.readFileSync('.env.local', 'utf8').split('\n');
for (const line of lines) {
  const tLine = line.trim();
  if (!tLine || tLine.startsWith('#')) continue;
  const idx = tLine.indexOf('=');
  if (idx > 0) {
    const key = tLine.slice(0, idx).trim();
    let val = tLine.slice(idx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    console.log('Adding ' + key + '...');
    try { execSync('npx vercel env rm ' + key + ' production --yes', { stdio: 'ignore' }); } catch(e){}
    const tmpFile = 'tmp_' + key + '.txt';
    fs.writeFileSync(tmpFile, val);
    try { execSync('npx vercel env add ' + key + ' production < ' + tmpFile, { stdio: 'inherit' }); } catch (e) { console.error('Failed to add ' + key); }
    fs.unlinkSync(tmpFile);
  }
}
