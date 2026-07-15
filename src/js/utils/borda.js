/**
 * Borda count calculation.
 *
 * Awards (cap-1) points for 1st place, (cap-2) for 2nd, etc.
 * Cap = min(n_candidates, max(seats, 10)) — prevents low-ranked
 * candidates from accumulating meaningless points in large fields.
 * Unranked candidates and ranks beyond the cap receive 0 points.
 *
 * @param {Array<Array<number|string>>} votes - Each vote is an ordered array of entry IDs (most preferred first)
 * @param {Array<number|string>} ids - All candidate IDs that appear in the election
 * @param {Object} entryMap - Maps entry_id to { name, image, color, hyperlink }
 * @param {number} [seats=1] - Number of positions to elect
 * @returns {{ winner: { id, name, image, color }, tally: Array<{ id, name, image, color, points, percent }>, cap: number }}
 */
export function computeBorda(votes, ids, entryMap, seats) {
  seats = seats || 1;
  var n = ids.length;
  var cap = Math.min(n, Math.max(seats, 10));
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
        var pts = Math.max(0, cap - 1 - rank);
        pointTotals[id] += pts;
        rankCounts[id][rank + 1] = (rankCounts[id][rank + 1] || 0) + 1;
      }
    });
    if (vote.length > 0 && firstPlaceVotes.hasOwnProperty(vote[0])) {
      firstPlaceVotes[vote[0]]++;
    }
  });

  var maxPoints = votes.length * (cap - 1);
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

  // Sort by points only first
  tally.sort(function (a, b) {
    return b.points - a.points;
  });

  // Apply first-place-votes tie-break only at the seat boundary
  var tieBreakApplied = false;
  var seatIdx = seats - 1; // index of last winner
  if (tally.length > seats && tally[seatIdx].points === tally[seats].points) {
    // There's a tie spanning the cutoff — re-sort tied group by first-place votes
    var tiedPoints = tally[seatIdx].points;
    var tieStart = seatIdx;
    while (tieStart > 0 && tally[tieStart - 1].points === tiedPoints) tieStart--;
    var tieEnd = seats;
    while (tieEnd < tally.length - 1 && tally[tieEnd + 1].points === tiedPoints) tieEnd++;
    var tiedGroup = tally.splice(tieStart, tieEnd - tieStart + 1);
    tiedGroup.sort(function (a, b) {
      return b.firstPlaceVotes - a.firstPlaceVotes;
    });
    Array.prototype.splice.apply(tally, [tieStart, 0].concat(tiedGroup));
    if (tally[seatIdx].firstPlaceVotes > tally[seats].firstPlaceVotes) {
      tieBreakApplied = true;
    }
  }

  var winner = tally[0] || null;

  return { winner: winner, tally: tally, tieBreakApplied: tieBreakApplied, cap: cap };
}
