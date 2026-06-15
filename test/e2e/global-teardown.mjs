import { teardownDatabase } from './db.mjs';
import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const readyFile = path.join(repoRoot, '.cache/e2e-db-ready');

export default async function globalTeardown() {
  try {
    await access(readyFile);
  } catch {
    return;
  }

  await teardownDatabase();
  await rm(readyFile, { force: true });
}
