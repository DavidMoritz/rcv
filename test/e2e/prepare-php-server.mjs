import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceDir = path.join(repoRoot, 'src');
const targetDir = path.join(repoRoot, '.cache/e2e-php');
const apiConfigPath = path.join(targetDir, 'api/config.php');

const dbHost = process.env.E2E_DB_HOST || 'localhost';
const dbPort = process.env.E2E_DB_PORT || '3306';
const dbUser = process.env.E2E_DB_USER || 'rcv_e2e_user';
const dbPassword = process.env.E2E_DB_PASSWORD || 'rcv_e2e_password';
const dbName = process.env.E2E_DB_NAME || 'rcv_e2e';

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

await rm(targetDir, { recursive: true, force: true });
await cp(sourceDir, targetDir, {
  recursive: true,
  filter: (source) => path.basename(source) !== 'config.php' && path.basename(source) !== 'config.prod.php'
});

await mkdir(path.dirname(apiConfigPath), { recursive: true });
await writeFile(
  apiConfigPath,
  `<?php
if (defined('PHPUNIT_RUNNING')) return;

define('SERVER', ${phpString(`${dbHost}:${dbPort}`)});
define('USERNAME', ${phpString(dbUser)});
define('PASSWORD', ${phpString(dbPassword)});
define('DB', ${phpString(dbName)});

$adminPassword = 'e2e-admin-password';

try {
  $dbh = new PDO('mysql:host=' . SERVER . ';dbname=' . DB, USERNAME, PASSWORD, array(PDO::ATTR_PERSISTENT => false));
} catch (PDOException $e) {
  die($e->getMessage());
}
?>
`,
  'utf8'
);
