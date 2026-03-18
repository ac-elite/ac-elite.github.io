import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const docsDir = path.join(rootDir, 'docs');

async function publishPages() {
  await rm(docsDir, { recursive: true, force: true });
  await mkdir(docsDir, { recursive: true });

  await cp(distDir, docsDir, { recursive: true });
  await cp(path.join(docsDir, 'index.html'), path.join(docsDir, '404.html'));
  await writeFile(path.join(docsDir, '.nojekyll'), '');

  console.log('Published GitHub Pages files to /docs');
}

publishPages().catch((error) => {
  console.error('Failed to publish GitHub Pages files:', error);
  process.exit(1);
});
