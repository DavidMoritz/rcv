/**
 * Test harness for running RCV elections in Vitest.
 *
 * Extracts VoteFactory from the Angular module, sets up a mock scope ($s),
 * and runs the election algorithm. Returns results for assertions.
 */

/**
 * Build entryMap and ids array from candidate name strings.
 * @param {string[]} names - e.g. ['Alice', 'Bob', 'Carol']
 * @returns {{ entryMap: Object, ids: number[] }}
 */
export function buildCandidates(names) {
  const entryMap = {};
  const ids = names.map((name, i) => {
    const id = i + 1;
    entryMap[id] = { name, image: '', color: null, hyperlink: '' };
    return id;
  });
  return { entryMap, ids };
}

/**
 * Convert human-readable ballots to id-based ballots.
 * @param {string[][]} ballots - e.g. [['Alice','Bob'], ['Bob','Carol']]
 * @param {{ entryMap: Object, ids: number[] }} candidates
 * @returns {number[][]}
 */
export function buildVotes(ballots, candidates) {
  const nameToId = {};
  candidates.ids.forEach((id) => {
    nameToId[candidates.entryMap[id].name] = id;
  });
  return ballots.map((ballot) => ballot.map((name) => nameToId[name]));
}

/**
 * Run an RCV election and return results.
 *
 * @param {Object} opts
 * @param {string[]} opts.candidates - candidate names
 * @param {string[][]} opts.ballots - ranked ballots (by name)
 * @param {number} [opts.seats=1] - seats to fill
 * @param {string} [opts.tieBreak='weighted'] - 'weighted' or 'random'
 * @param {string} [opts.ballotName='Test Election'] - election name
 * @returns {{ elected: Object[], outputstring: string, jsonObj: Object }}
 */
export function runElection(opts) {
  const {
    candidates: candidateNames,
    ballots,
    seats = 1,
    tieBreak = 'weighted',
    ballotName = 'Test Election'
  } = opts;

  const { entryMap, ids } = buildCandidates(candidateNames);
  const votes = buildVotes(ballots, { entryMap, ids });
  const mutableVotes = JSON.parse(JSON.stringify(votes));

  // Get a fresh VoteFactory instance via Angular's injector
  // 'ng' must be included — it provides $controllerProvider etc. needed by mainApp
  const injector = angular.injector(['ng', 'mainApp']);
  const vf = injector.get('VoteFactory');

  // Set up window.$s (the mock scope that VoteFactory reads from)
  window.$s = {
    entryMap,
    ids: [...ids],
    votes,
    mutableVotes,
    ballotName,
    bbiBallot: false,
    patchRcvis: false,
    rcvisId: null,
    rcvisSlug: null,
    ballotIsSecure: false,
    voterIds: votes.map((_, i) => i + 1),
    rightNow: moment()
  };

  // Configure the factory instance
  vf.votes = votes;
  vf.mutableVotes = mutableVotes;
  vf.ids = [...ids];
  vf.seats = seats;
  vf.tieBreak = tieBreak;
  vf.voterNames = [];
  vf.voterIds = votes.map((_, i) => i + 1);

  // Run the election
  vf.runTheCode(false);

  return {
    elected: vf.elected,
    outputstring: vf.outputstring,
    jsonObj: vf.jsonObj
  };
}

/**
 * Extract winner names from election result.
 * @param {{ elected: { name: string }[] }} result
 * @returns {string[]}
 */
export function getWinnerNames(result) {
  return result.elected.map((w) => w.name);
}
