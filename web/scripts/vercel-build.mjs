import { spawnSync } from 'child_process';

const isProduction = process.env.VERCEL_ENV === 'production';

if (isProduction) {
  console.log('--- VERCEL PRODUCTION BUILD DETECTED ---');
  console.log('Running preflight and production build...');
  const res = spawnSync('npm', ['run', 'build:production'], { stdio: 'inherit', shell: true });
  process.exit(res.status ?? 1);
} else {
  console.log('--- STANDARD NEXT.JS BUILD ---');
  const res = spawnSync('npm', ['run', 'build:next'], { stdio: 'inherit', shell: true });
  process.exit(res.status ?? 1);
}
