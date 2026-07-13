/**
 * Borda count calculation.
 *
 * Awards (n-1) points for 1st place, (n-2) for 2nd, etc.
 * Unranked candidates receive 0 points.
 *
 * @param {Array<Array<number|string>>} votes - Each vote is an ordered array of entry IDs (most preferred first)
 * @param {Array<number|string>} ids - All candidate IDs that appear in the election
 * @param {Object} entryMap - Maps entry_id to { name, image, color, hyperlink }
 * @returns {{ winner: { id, name, image, color }, tally: Array<{ id, name, image, color, points, percent }> }}
 */
export function computeBorda(votes, ids, entryMap) {
  var n = ids.length;
  var pointTotals = {};

  ids.forEach(function (id) {
    pointTotals[id] = 0;
  });

  var firstPlaceVotes = {};
  var rankCounts = {};
  ids.forEach(function (id) {
    firstPlaceVotes[id] = 0;
    rankCounts[id] = {};
  });

  votes.forEach(function (vote) {
    vote.forEach(function (id, rank) {
      if (pointTotals.hasOwnProperty(id)) {
        pointTotals[id] += (n - 1 - rank);
        rankCounts[id][rank + 1] = (rankCounts[id][rank + 1] || 0) + 1;
      }
    });
    if (vote.length > 0 && firstPlaceVotes.hasOwnProperty(vote[0])) {
      firstPlaceVotes[vote[0]]++;
    }
  });

  var maxPoints = votes.length * (n - 1);
  var tally = ids.map(function (id) {
    var entry = entryMap[id] || { name: String(id) };
    var points = pointTotals[id];
    var rc = rankCounts[id];
    var totalRanked = 0;
    var rankSum = 0;
    Object.keys(rc).forEach(function (r) {
      totalRanked += rc[r];
      rankSum += Number(r) * rc[r];
    });
    return {
      id: id,
      name: entry.name || String(id),
      image: entry.image || '',
      color: entry.color || '',
      points: points,
      firstPlaceVotes: firstPlaceVotes[id],
      percent: maxPoints > 0 ? Math.round((points / maxPoints) * 1000) / 10 : 0,
      rankCounts: rc,
      avgRank: totalRanked > 0 ? Math.round((rankSum / totalRanked) * 10) / 10 : null
    };
  });

  tally.sort(function (a, b) {
    if (b.points !== a.points) return b.points - a.points;
    return b.firstPlaceVotes - a.firstPlaceVotes;
  });

  var winner = tally[0] || null;
  var tieBreakApplied = tally.length >= 2 &&
    tally[0].points === tally[1].points &&
    tally[0].firstPlaceVotes > tally[1].firstPlaceVotes;

  return { winner: winner, tally: tally, tieBreakApplied: tieBreakApplied };
}
