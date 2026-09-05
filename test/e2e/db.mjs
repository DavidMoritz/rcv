import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const modulePath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(modulePath), '../..');
const schemaPath = path.join(repoRoot, 'src/api/setup-database-prod.sql');

const config = {
  adminUser: process.env.E2E_DB_ADMIN_USER || 'root',
  adminPassword: process.env.E2E_DB_ADMIN_PASSWORD || '',
  adminHost: process.env.E2E_DB_ADMIN_HOST || 'localhost',
  adminPort: process.env.E2E_DB_ADMIN_PORT || '3306',
  appUser: process.env.E2E_DB_USER || 'rcv_e2e_user',
  appPassword: process.env.E2E_DB_PASSWORD || 'rcv_e2e_password',
  appHost: process.env.E2E_DB_HOST || 'localhost',
  appPort: process.env.E2E_DB_PORT || '3306',
  dbName: process.env.E2E_DB_NAME || 'rcv_e2e'
};

function quoteIdent(value) {
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe MySQL identifier for E2E database: ${value}`);
  }
  return `\`${value}\``;
}

function sqlString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function mysqlArgs() {
  const args = ['-h', config.adminHost, '-P', config.adminPort, '-u', config.adminUser];
  if (config.adminPassword) {
    args.push(`-p${config.adminPassword}`);
  }
  return args;
}

async function runMysql(sql) {
  await new Promise((resolve, reject) => {
    const child = spawn(process.env.MYSQL || 'mysql', mysqlArgs(), {
      cwd: repoRoot,
      stdio: ['pipe', 'inherit', 'inherit']
    });

    child.stdin.end(sql);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`mysql exited with code ${code}`));
      }
    });
  });
}

async function schemaTablesSql() {
  const schema = await readFile(schemaPath, 'utf8');
  const start = schema.indexOf('/*!40101 SET @OLD_CHARACTER_SET_CLIENT');
  if (start === -1) {
    throw new Error('Could not find start of table schema in setup-database-prod.sql');
  }
  return schema.slice(start);
}

export async function setupDatabase() {
  const dbName = quoteIdent(config.dbName);
  const tables = await schemaTablesSql();
  await runMysql(`
DROP DATABASE IF EXISTS ${dbName};
CREATE DATABASE ${dbName} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS ${sqlString(config.appUser)}@${sqlString(config.appHost)} IDENTIFIED BY ${sqlString(config.appPassword)};
GRANT ALL PRIVILEGES ON ${dbName}.* TO ${sqlString(config.appUser)}@${sqlString(config.appHost)};
FLUSH PRIVILEGES;
USE ${dbName};
${tables}
INSERT INTO random_codes (code) VALUES ('e2eabc');
`);
}

export async function teardownDatabase() {
  if (process.env.E2E_KEEP_DB === '1') {
    return;
  }

  await runMysql(`DROP DATABASE IF EXISTS ${quoteIdent(config.dbName)};`);
}

if (process.argv[1] === modulePath) {
  const command = process.argv[2];
  if (command === 'setup') {
    await setupDatabase();
  } else if (command === 'teardown') {
    await teardownDatabase();
  } else if (command) {
    throw new Error(`Unknown E2E database command: ${command}`);
  }
}
