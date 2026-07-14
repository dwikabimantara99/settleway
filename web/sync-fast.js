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
    if (key.startsWith('SETTLEWAY_') || key.startsWith('CUSTODY_V2_') || key === 'STELLAR_PLATFORM_SECRET' || key === 'NEXT_PUBLIC_CUSTODY_V2_CONTRACT_ID' || key === 'WALLET_ENCRYPTION_KEY') {
      console.log('Adding ' + key);
      fs.writeFileSync('tmp_'+key+'.txt', val);
      try { execSync('cmd.exe /c npx vercel env rm ' + key + ' production -y', {stdio:'ignore'}); } catch(e){}
      try { execSync('cmd.exe /c npx vercel env add ' + key + ' production < tmp_'+key+'.txt'); } catch(e){ console.log('Failed '+key); }
      fs.unlinkSync('tmp_'+key+'.txt');
    }
  }
}
