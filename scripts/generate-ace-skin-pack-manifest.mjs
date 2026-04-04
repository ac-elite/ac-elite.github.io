import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packRoot = path.join(__dirname, '..', 'public', 'assets', 'liveries', 'ace-skin-pack');
const outFile = path.join(__dirname, '..', 'public', 'data', 'ace-skin-pack.json');

/** Title from file name, e.g. ace03.jpg -> ACE #03 */
function titleFromFileName(fileName) {
  const m = fileName.match(/^ace(\d+)\.jpg$/i);
  if (m) return `ACE #${m[1]}`;
  return fileName.replace(/\.jpg$/i, '').toUpperCase();
}

function idFromFileName(fileName) {
  const m = fileName.match(/^ace(\d+)\.jpg$/i);
  if (m) return `ACE#${m[1]}`;
  return fileName.replace(/\.jpg$/i, '').toUpperCase();
}

function main() {
  const entries = [];

  if (fs.existsSync(packRoot)) {
    for (const name of fs.readdirSync(packRoot)) {
      const filePath = path.join(packRoot, name);
      const stat = fs.statSync(filePath);
      if (!stat.isFile()) continue;
      if (!/\.jpg$/i.test(name)) continue;

      entries.push({
        id: idFromFileName(name),
        title: titleFromFileName(name),
        previewUrl: `/assets/liveries/ace-skin-pack/${encodeURIComponent(name)}`,
      });
    }
  }

  entries.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(
    outFile,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
    'utf8'
  );

  console.log(`ace-skin-pack: ${entries.length} entries -> ${path.relative(process.cwd(), outFile)}`);
}

main();
