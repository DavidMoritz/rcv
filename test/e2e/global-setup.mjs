import { setupDatabase } from './db.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readyFile = path.join(repoRoot, '.cache', `e2e-db-ready-${process.env.E2E_RUN_ID || 'default'}`);

export default async function globalSetup() {
  await setupDatabase();
  await mkdir(path.dirname(readyFile), { recursive: true });
  await writeFile(readyFile, 'ready\n', 'utf8');
}
