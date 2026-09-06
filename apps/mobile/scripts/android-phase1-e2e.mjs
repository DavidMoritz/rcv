import { execFileSync } from 'node:child_process';

const adb = process.env.ADB ?? 'adb';
const ballotKey = process.env.RCV_E2E_BALLOT_KEY ?? 'pizza';
const voterCode = process.env.RCV_E2E_VOTER_CODE?.trim();
const groupOptionLabel = process.env.RCV_E2E_GROUP_OPTION_LABEL?.trim();
const shareOnly = process.env.RCV_E2E_SHARE_ONLY === '1';
const createBallot = process.env.RCV_E2E_CREATE_BALLOT === '1';
const appPackage = process.env.RCV_E2E_APP_PACKAGE ?? 'host.exp.exponent';
const incomingUrl =
  process.env.RCV_E2E_INCOMING_URL ??
  (createBallot
    ? 'exp://127.0.0.1:8081/--/create'
    : `exp://127.0.0.1:8081/--/ballot/${encodeURIComponent(ballotKey)}`);
const coldStart = process.env.RCV_E2E_COLD_START !== '0';

if (voterCode && !/^[A-Za-z0-9]{6}$/.test(voterCode)) {
  throw new Error('RCV_E2E_VOTER_CODE must contain exactly six letters or digits.');
}

function run(...args) {
  return execFileSync(adb, args, { encoding: 'utf8' });
}

function sleep(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function dump() {
  run('shell', 'uiautomator', 'dump', '/sdcard/rcv-window.xml');
  return run('shell', 'cat', '/sdcard/rcv-window.xml');
}

function waitFor(pattern, description, timeout = 30_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const xml = dump();
    if (pattern.test(xml)) return xml;
    sleep(500);
  }
  throw new Error(`Timed out waiting for ${description}.`);
}

function scrollUntil(pattern, description, attempts = 6) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const xml = dump();
    if (pattern.test(xml)) return xml;
    run('shell', 'input', 'swipe', '540', '2200', '540', '350', '400');
  }
  throw new Error(`Could not locate ${description} after scrolling.`);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function center(bounds) {
  const match = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
  if (!match) throw new Error(`Invalid Android bounds: ${bounds}`);
  return [Math.round((Number(match[1]) + Number(match[3])) / 2), Math.round((Number(match[2]) + Number(match[4])) / 2)];
}

function tapMatching(xml, pattern, description) {
  const match = xml.match(pattern);
  if (!match) throw new Error(`Could not locate ${description}.`);
  const [x, y] = center(match[1]);
  run('shell', 'input', 'tap', String(x), String(y));
}

const startArguments = [
  'shell',
  'am',
  'start',
  ...(coldStart ? ['-S'] : []),
  '-W',
  '-a',
  'android.intent.action.VIEW',
  '-d',
  incomingUrl,
  appPackage,
];
run(...startArguments);

let xml;

if (createBallot) {
  const suffix = String(Date.now()).slice(-6);
  const fields = [
    ['Ballot name', `E2E-${suffix}`],
    ['Candidate 1', `Alpha-${suffix}`],
    ['Candidate 2', `Beta-${suffix}`],
  ];

  xml = waitFor(/content-desc="Ballot name"/, 'the basic ballot form');
  for (const [label, value] of fields) {
    const pattern = new RegExp(`content-desc="${escapeRegExp(label)}"[^>]*bounds="([^"]+)"`);
    xml = scrollUntil(pattern, `${label} field`);
    tapMatching(xml, pattern, `${label} field`);
    run('shell', 'input', 'text', value);
    run('shell', 'input', 'keyevent', '4');
  }

  xml = scrollUntil(/content-desc="Create ballot"[^>]*bounds="([^"]+)"/, 'the create button');
  tapMatching(xml, /content-desc="Create ballot"[^>]*bounds="([^"]+)"/, 'the create button');
  xml = waitFor(/text="BALLOT CREATED"/, 'the created-ballot state');
  waitFor(/text="Management access is protected on this device\."/, 'encrypted credential storage');

  const shortcode = xml.match(/text="([a-f0-9]{8})"/)?.[1];
  if (!shortcode) throw new Error('Could not read the created ballot shortcode.');

  xml = scrollUntil(/content-desc="Open ballot"[^>]*bounds="([^"]+)"/, 'the open-ballot button');
  tapMatching(xml, /content-desc="Open ballot"[^>]*bounds="([^"]+)"/, 'the open-ballot button');
  waitFor(new RegExp(`text="Shortcode: ${shortcode}"`), 'the newly created ballot');
  console.log(`Android guest-ballot creation E2E passed for shortcode ${shortcode}`);
  process.exit(0);
}

xml = waitFor(/text="Shortcode: [^"]+"/, 'the incoming ballot link');

if (shareOnly) {
  tapMatching(
    xml,
    /content-desc="Share ballot"[^>]*bounds="([^"]+)"/,
    'the native share action',
  );
  const canonicalUrl = `https://rankedchoices.com/ballot/${encodeURIComponent(ballotKey)}`;
  waitFor(new RegExp(escapeRegExp(canonicalUrl)), 'the canonical link in the system share sheet');
  run('shell', 'input', 'keyevent', '4');
  console.log(`Android share E2E passed for ${canonicalUrl}`);
  process.exit(0);
}

if (groupOptionLabel) {
  const optionPattern = new RegExp(
    `content-desc="${escapeRegExp(groupOptionLabel)}"[^>]*bounds="([^"]+)"`,
  );
  xml = scrollUntil(optionPattern, `group option ${groupOptionLabel}`);
  tapMatching(xml, optionPattern, `group option ${groupOptionLabel}`);
}

xml = scrollUntil(/content-desc="Move [^"]+ down"/, 'an accessible move-down control');
tapMatching(
  xml,
  /content-desc="Move [^"]+ down"[^>]*bounds="([^"]+)"/,
  'an accessible move-down control',
);
waitFor(/content-desc="Move [^"]+ up"/, 'the updated candidate ranking');

if (voterCode) {
  xml = scrollUntil(/content-desc="Voter code"/, 'the voter-code field');
  tapMatching(xml, /content-desc="Voter code"[^>]*bounds="([^"]+)"/, 'the voter-code field');
  run('shell', 'input', 'text', voterCode);
  run('shell', 'input', 'keyevent', '4');
}

xml = scrollUntil(/content-desc="Submit vote"/, 'the submit button');
tapMatching(xml, /content-desc="Submit vote"[^>]*bounds="([^"]+)"/, 'the submit button');

waitFor(/text="Vote recorded"/, 'the accepted vote state');
waitFor(/text="Current results"/, 'the locally calculated election results');

console.log(`Android vote E2E passed for ${incomingUrl}`);
