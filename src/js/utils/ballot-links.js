export function canonicalBallotPath(key) {
  return '/ballot/' + encodeURIComponent(String(key || '').trim());
}

export function canonicalBallotUrl(origin, key) {
  return String(origin || '').replace(/\/+$/, '') + canonicalBallotPath(key);
}

export function canonicalBallotKey(pathname) {
  var match = String(pathname || '').match(/^\/ballot\/([^/]+)\/?$/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch (_error) {
    return null;
  }
}

export function isLegacyBallotPath(pathname, key) {
  return String(pathname || '') === '/' + encodeURIComponent(String(key || '').trim());
}
