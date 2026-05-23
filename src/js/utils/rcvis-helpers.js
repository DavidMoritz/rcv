/**
 * Pure helpers for RCVis graph display decisions.
 *
 * Extracted from main.js so they can be unit-tested without booting AngularJS.
 * Keep these dependency-free — no moment, no scope, no DOM.
 */

/**
 * True if the rcvis graph is stale relative to the most recent vote
 * (used on the post-cutoff path).
 */
export function shouldPatchGraph({ rcvisSlug, graphUpdated, mostRecentVote }) {
  return !rcvisSlug || !graphUpdated || graphUpdated < mostRecentVote;
}

/**
 * True if both the vote-count and time thresholds indicate it's time to
 * auto-update the graph. `minVotes` / `minMinutes` fall back to 15 / 120
 * when falsy, matching the production defaults in main.js.
 */
export function shouldAutoUpdate({
  rcvisSlug,
  votesSinceUpdate,
  minutesSinceUpdate,
  minVotes,
  minMinutes
}) {
  var resolvedMinVotes = minVotes || 15;
  var resolvedMinMinutes = minMinutes || 120;
  var votesThresholdMet = votesSinceUpdate >= resolvedMinVotes;
  var timeThresholdMet =
    minutesSinceUpdate !== null && minutesSinceUpdate >= resolvedMinMinutes;
  return !!rcvisSlug && votesThresholdMet && timeThresholdMet;
}

/**
 * True if the current viewer is allowed to see the live graph.
 * `isCreator` should reflect `$s.user.id == ballot.createdBy`.
 */
export function canSeeGraph({ resultsDate, now, isCreator, rcvisInfo }) {
  var resultsVisible = !resultsDate || resultsDate < now;
  var creatorWithKey = isCreator && rcvisInfo && rcvisInfo.apiKey;
  return resultsVisible || !!creatorWithKey;
}

/**
 * True if the ballot's voting window has closed (cutoff exists and is past).
 */
export function shouldUsePostCutoffPath({ voteCutoffDate, now }) {
  return !!(voteCutoffDate && voteCutoffDate < now);
}
