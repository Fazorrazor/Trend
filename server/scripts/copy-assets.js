import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const src = path.join(__dirname, '../src/db/schema.sql');
const dest = path.join(__dirname, '../dist/db/schema.sql');

if (!fs.existsSync(src)) {
    console.error('Core schema file not found at:', src);
    process.exit(1);
}

const destDir = path.dirname(dest);
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Copied schema.sql to dist/db/schema.sql');
