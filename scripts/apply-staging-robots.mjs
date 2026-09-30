import { copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
copyFileSync(
  join(root, 'public/robots.staging.txt'),
  join(root, 'public/robots.txt'),
);
console.log('robots.txt → staging (Disallow /)');
