import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(mobileRoot, '../..');
const require = createRequire(import.meta.url);

const loadJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const appJson = loadJson(join(mobileRoot, 'app.json')).expo;
const packageJson = loadJson(join(mobileRoot, 'package.json'));
const eas = loadJson(join(mobileRoot, 'eas.json'));
const metadata = loadJson(join(mobileRoot, 'store/metadata/en-US.json'));
const releaseStatus = loadJson(join(mobileRoot, 'store/release-status.json'));
const configureApp = require(join(mobileRoot, 'app.config.js'));

const failures = [];
const check = (condition, message) => {
  if (!condition) failures.push(message);
};
const isHttpsUrl = (value) => {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
};
const utf8Length = (value) => Buffer.byteLength(value, 'utf8');

check(/^\d+\.\d+\.\d+$/.test(appJson.version), 'Expo version must use x.y.z format.');
check(packageJson.version === appJson.version, 'package.json and app.json versions must match.');
check(/^\d+$/.test(appJson.ios?.buildNumber ?? ''), 'iOS buildNumber must be numeric.');
check(Number.isInteger(appJson.android?.versionCode) && appJson.android.versionCode > 0,
  'Android versionCode must be a positive integer.');

const expectedVariants = {
  development: { identifier: 'com.rankedchoices.dev', host: null },
  staging: { identifier: 'com.rankedchoices.app.staging', host: 'staging.rankedchoices.com' },
  production: { identifier: 'com.rankedchoices.app', host: 'rankedchoices.com' },
};

const identifierOverrides = {
  RCV_ANDROID_PACKAGE: process.env.RCV_ANDROID_PACKAGE,
  RCV_IOS_BUNDLE_IDENTIFIER: process.env.RCV_IOS_BUNDLE_IDENTIFIER,
};
delete process.env.RCV_ANDROID_PACKAGE;
delete process.env.RCV_IOS_BUNDLE_IDENTIFIER;

for (const [variant, expected] of Object.entries(expectedVariants)) {
  const previousVariant = process.env.APP_VARIANT;
  process.env.APP_VARIANT = variant;
  const resolved = configureApp({ config: structuredClone(appJson) });
  if (previousVariant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = previousVariant;

  check(resolved.ios?.bundleIdentifier === expected.identifier,
    `${variant} iOS identifier must be ${expected.identifier}.`);
  check(resolved.android?.package === expected.identifier,
    `${variant} Android package must be ${expected.identifier}.`);

  const domains = resolved.ios?.associatedDomains ?? [];
  const filters = resolved.android?.intentFilters ?? [];
  if (expected.host) {
    check(domains.includes(`applinks:${expected.host}`),
      `${variant} must claim the expected iOS associated domain.`);
    check(filters.some((filter) => filter.data?.some((data) =>
      data.scheme === 'https' && data.host === expected.host && data.pathPrefix === '/ballot/')),
    `${variant} must claim only the canonical Android ballot path.`);
  } else {
    check(domains.length === 0 && filters.length === 0,
      'Development builds must not claim a verified web domain.');
  }

  check(eas.build?.[variant]?.env?.APP_VARIANT === variant,
    `EAS ${variant} profile must set its matching APP_VARIANT.`);
}

for (const [name, value] of Object.entries(identifierOverrides)) {
  if (value !== undefined) process.env[name] = value;
}

check(eas.build?.production?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://rankedchoices.com/api',
  'Production EAS profile must target the production HTTPS API.');
const stagingTargetsProduction =
  eas.build?.staging?.env?.EXPO_PUBLIC_API_BASE_URL === 'https://rankedchoices.com/api';
check(!stagingTargetsProduction || releaseStatus.blockers.some(({ id }) => id === 'staging-environment'),
  'A production-targeting staging profile must remain recorded as a release blocker.');

check(utf8Length(metadata.shared.appName) <= 30, 'Store app name exceeds 30 characters.');
check(utf8Length(metadata.apple.subtitle) <= 30, 'Apple subtitle exceeds 30 characters.');
check(utf8Length(metadata.apple.promotionalText) <= 170,
  'Apple promotional text exceeds 170 characters.');
check(utf8Length(metadata.apple.description) <= 4000,
  'Apple description exceeds 4,000 characters.');
check(utf8Length(metadata.apple.keywords) <= 100, 'Apple keywords exceed 100 bytes.');
check(utf8Length(metadata.googlePlay.shortDescription) <= 80,
  'Play short description exceeds 80 characters.');
check(utf8Length(metadata.googlePlay.fullDescription) <= 4000,
  'Play full description exceeds 4,000 characters.');

for (const [label, url] of Object.entries({
  appleSupport: metadata.apple.supportUrl,
  appleMarketing: metadata.apple.marketingUrl,
  applePrivacy: metadata.apple.privacyPolicyUrl,
  playWebsite: metadata.googlePlay.website,
  playPrivacy: metadata.googlePlay.privacyPolicyUrl,
})) {
  check(isHttpsUrl(url), `${label} must be a valid HTTPS URL.`);
}

check(metadata.screenshots.length >= 4, 'At least four screenshot scenes must be planned.');
check(metadata.screenshots.every((item, index) => item.order === index + 1),
  'Screenshot order values must be consecutive and start at one.');
check(metadata.screenshots.every((item) => item.altText && item.altText.length <= 140),
  'Every screenshot must have concise alt text (140 characters or fewer).');

const appleAssociation = readFileSync(
  join(repositoryRoot, 'docs/mobile-association-files/apple-app-site-association.template.json'),
  'utf8',
);
const androidAssociation = readFileSync(
  join(repositoryRoot, 'docs/mobile-association-files/assetlinks.template.json'),
  'utf8',
);
check(appleAssociation.includes('APPLE_TEAM_ID'), 'Apple association template lost its safe placeholder.');
check(androidAssociation.includes('ANDROID_RELEASE_SHA256_FINGERPRINT'),
  'Android association template lost its safe placeholder.');

const placeholderPatterns = ['APPLE_TEAM_ID', 'ANDROID_RELEASE_SHA256_FINGERPRINT'];
const scanDeployableFiles = (directory) => {
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) scanDeployableFiles(path);
    else {
      const bytes = readFileSync(path);
      for (const placeholder of placeholderPatterns) {
        check(!bytes.includes(Buffer.from(placeholder)),
          `Deployable source contains association placeholder ${placeholder}: ${path}`);
      }
    }
  }
};
scanDeployableFiles(join(repositoryRoot, 'src'));

const blockerIds = releaseStatus.blockers.map(({ id }) => id);
check(new Set(blockerIds).size === blockerIds.length, 'Release blocker IDs must be unique.');
check(releaseStatus.blockers.every(({ gate, owner, summary }) => gate && owner && summary),
  'Every release blocker needs a gate, owner, and summary.');

const createScreen = readFileSync(join(mobileRoot, 'src/app/create.tsx'), 'utf8');
const ballotScreen = readFileSync(join(mobileRoot, 'src/app/ballot/[key]/index.tsx'), 'utf8');
check(createScreen.includes('<TermsAcceptance'), 'Create flow must retain explicit terms acceptance.');
check(ballotScreen.includes('<BallotReportLink'), 'Ballot screen must retain its reporting action.');

if (failures.length) {
  console.error('Release-readiness validation failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Release metadata/configuration checks passed for ${appJson.version}.`);
console.log(`Resolved decisions: ${releaseStatus.resolved.length}`);
console.log(`Manual release blockers: ${releaseStatus.blockers.length}`);
releaseStatus.blockers.forEach(({ gate, id, owner }) =>
  console.log(`- [${gate}] ${id} (${owner})`));

if (process.argv.includes('--strict') && releaseStatus.blockers.length > 0) {
  console.error('Strict release gate remains closed until every recorded blocker is resolved.');
  process.exit(2);
}
