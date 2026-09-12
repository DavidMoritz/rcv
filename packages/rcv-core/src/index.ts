export type CandidateId = number;

export type RcvCandidate = {
  id: CandidateId;
  name: string;
};

export type TieBreak = 'weighted' | 'random';

export type ElectionInput = {
  candidates: readonly RcvCandidate[];
  ballots: readonly (readonly CandidateId[])[];
  seats?: number;
  tieBreak?: TieBreak;
  ballotKey?: string;
};

export type RoundOutcome =
  | { type: 'elected'; candidateId: CandidateId; candidateName: string }
  | { type: 'eliminated'; candidateId: CandidateId; candidateName: string };

export type ElectionRound = {
  number: number;
  quota: number;
  tally: Record<CandidateId, number>;
  exhaustedVotes: number;
  outcome: RoundOutcome;
};

export type ElectionResult = {
  candidates: RcvCandidate[];
  winners: RcvCandidate[];
  rounds: ElectionRound[];
  seats: number;
};

export type BordaInput = {
  candidates: readonly RcvCandidate[];
  ballots: readonly (readonly CandidateId[])[];
  seats?: number;
};

export type BordaTally = RcvCandidate & {
  points: number;
  firstPlaceVotes: number;
  percent: number;
  rankCounts: Record<number, number>;
  averageRank: number | null;
};

export type BordaResult = {
  candidates: RcvCandidate[];
  winners: RcvCandidate[];
  tally: BordaTally[];
  seats: number;
  cap: number;
  tieBreakApplied: boolean;
};

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function calculateBorda(input: BordaInput): BordaResult {
  const candidates = input.candidates.filter(
    (candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index,
  );
  if (candidates.length === 0) {
    return { candidates: [], winners: [], tally: [], seats: 0, cap: 0, tieBreakApplied: false };
  }

  const seats = Math.max(1, Math.min(Math.trunc(input.seats ?? 1), candidates.length));
  const cap = Math.min(candidates.length, Math.max(seats, 10));
  const validIds = new Set(candidates.map((candidate) => candidate.id));
  const ballots = input.ballots.map((ballot) =>
    ballot.filter(
      (id, index, ranking) => validIds.has(id) && ranking.indexOf(id) === index,
    ),
  );
  const maxPoints = ballots.length * Math.max(0, cap - 1);

  const tally = candidates.map<BordaTally>((candidate) => {
    let points = 0;
    let firstPlaceVotes = 0;
    let rankSum = 0;
    let totalRanked = 0;
    const rankCounts: Record<number, number> = {};

    ballots.forEach((ballot) => {
      const rank = ballot.indexOf(candidate.id);
      if (rank < 0) return;
      points += Math.max(0, cap - 1 - rank);
      firstPlaceVotes += rank === 0 ? 1 : 0;
      rankCounts[rank + 1] = (rankCounts[rank + 1] ?? 0) + 1;
      rankSum += rank + 1;
      totalRanked += 1;
    });

    return {
      ...candidate,
      points,
      firstPlaceVotes,
      percent: maxPoints > 0 ? round((points / maxPoints) * 100, 1) : 0,
      rankCounts,
      averageRank: totalRanked > 0 ? round(rankSum / totalRanked, 1) : null,
    };
  });

  tally.sort((left, right) => right.points - left.points);

  let tieBreakApplied = false;
  if (tally.length > seats && tally[seats - 1].points === tally[seats].points) {
    const tiedPoints = tally[seats - 1].points;
    let tieStart = seats - 1;
    while (tieStart > 0 && tally[tieStart - 1].points === tiedPoints) tieStart -= 1;
    let tieEnd = seats;
    while (tieEnd < tally.length - 1 && tally[tieEnd + 1].points === tiedPoints) tieEnd += 1;
    const tied = tally.splice(tieStart, tieEnd - tieStart + 1);
    tied.sort((left, right) => right.firstPlaceVotes - left.firstPlaceVotes);
    tally.splice(tieStart, 0, ...tied);
    tieBreakApplied = tally[seats - 1].firstPlaceVotes > tally[seats].firstPlaceVotes;
  }

  return {
    candidates,
    winners: tally.slice(0, seats).map(({ id, name }) => ({ id, name })),
    tally,
    seats,
    cap,
    tieBreakApplied,
  };
}

function deterministicScore(ballotKey: string, candidateId: CandidateId, roundNumber: number) {
  const str = `${candidateId % 1000}${ballotKey}${roundNumber}`;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function chooseTiedCandidate(
  ids: readonly CandidateId[],
  names: ReadonlyMap<CandidateId, string>,
  tied: readonly CandidateId[],
  ballots: readonly CandidateId[][],
  weights: readonly number[],
  tieBreak: TieBreak,
  electing: boolean,
  roundNumber: number,
  ballotKey: string,
): CandidateId {
  if (tieBreak === 'random') {
    return [...tied]
      .map((id) => ({
        id,
        score: deterministicScore(ballotKey, id, roundNumber),
      }))
      .sort((left, right) => right.score - left.score || ids.indexOf(left.id) - ids.indexOf(right.id))[0].id;
  }

  const values = new Map(tied.map((id) => [id, 0]));
  const longestBallot = ballots.reduce((length, ballot) => Math.max(length, ballot.length), 0);
  for (let rank = 1; rank < longestBallot; rank += 1) {
    ballots.forEach((ballot, ballotIndex) => {
      const id = ballot[rank];
      if (values.has(id)) {
        values.set(id, (values.get(id) ?? 0) + weights[ballotIndex] / 10 ** rank);
      }
    });
  }

  return [...tied].sort((left, right) => {
    const difference = (values.get(right) ?? 0) - (values.get(left) ?? 0);
    return (electing ? difference : -difference) || ids.indexOf(left) - ids.indexOf(right);
  })[0];
}

export function calculateElection(input: ElectionInput): ElectionResult {
  const candidates = input.candidates.filter(
    (candidate, index, all) => all.findIndex((item) => item.id === candidate.id) === index,
  );
  if (candidates.length === 0) return { candidates: [], winners: [], rounds: [], seats: 0 };

  const ids = candidates.map((candidate) => candidate.id);
  const validIds = new Set(ids);
  const names = new Map(candidates.map((candidate) => [candidate.id, candidate.name]));
  const seats = Math.max(1, Math.min(Math.trunc(input.seats ?? 1), candidates.length));
  const tieBreak = input.tieBreak ?? 'weighted';
  const ballotKey = input.ballotKey ?? '';
  const ballots = input.ballots.map((ballot) =>
    ballot.filter(
      (id, index, ranking) => validIds.has(id) && ranking.indexOf(id) === index,
    ),
  );
  const weights = ballots.map(() => 1);
  const active = new Set(ids);
  const winners: RcvCandidate[] = [];
  const rounds: ElectionRound[] = [];
  const maxRounds = candidates.length * 2 + seats;

  while (winners.length < seats && rounds.length < maxRounds && active.size > 0) {
    const remainingSeats = seats - winners.length;
    const voteValue = weights.reduce((total, weight) => total + weight, 0);
    let quota = round(voteValue / (remainingSeats + 1), 2);
    const tally = Object.fromEntries(ids.map((id) => [id, 0])) as Record<CandidateId, number>;
    let exhaustedVotes = 0;

    ballots.forEach((ballot, index) => {
      const firstChoice = ballot.find((id) => active.has(id));
      if (firstChoice === undefined) exhaustedVotes += weights[index];
      else tally[firstChoice] += weights[index];
    });
    ids.forEach((id) => {
      tally[id] = round(tally[id], 4);
    });

    const activeWithVotes = [...active].filter((id) => tally[id] > 0);
    const exceedsQuota = activeWithVotes.filter((id) => tally[id] > quota);
    const electing = exceedsQuota.length > 0 || activeWithVotes.length === 1 || active.size <= remainingSeats;
    const pool = electing
      ? exceedsQuota.length > 0
        ? exceedsQuota
        : activeWithVotes.length > 0
          ? activeWithVotes
          : [...active]
      : activeWithVotes;
    const targetValue = electing
      ? Math.max(...pool.map((id) => tally[id]))
      : Math.min(...pool.map((id) => tally[id]));
    const tied = pool.filter((id) => tally[id] === targetValue);
    const chosen =
      tied.length === 1
        ? tied[0]
        : chooseTiedCandidate(
            ids,
            names,
            tied,
            ballots,
            weights,
            tieBreak,
            electing,
            rounds.length + 1,
            ballotKey,
          );

    if (electing && activeWithVotes.length === 1) quota = Math.min(quota, tally[chosen]);
    const candidate = candidates.find((item) => item.id === chosen)!;
    const outcome: RoundOutcome = {
      type: electing ? 'elected' : 'eliminated',
      candidateId: chosen,
      candidateName: candidate.name,
    };
    rounds.push({
      number: rounds.length + 1,
      quota,
      tally,
      exhaustedVotes: round(exhaustedVotes, 4),
      outcome,
    });

    if (electing) {
      winners.push(candidate);
      const chosenTally = tally[chosen];
      if (chosenTally > 0) {
        ballots.forEach((ballot, index) => {
          if (ballot.find((id) => active.has(id)) === chosen) {
            weights[index] *= 1 - quota / chosenTally;
          }
        });
      }
    }
    active.delete(chosen);

    if (!electing) {
      [...active].filter((id) => tally[id] === 0).forEach((id) => active.delete(id));
    }
    ballots.forEach((ballot, index) => {
      if (!ballot.some((id) => active.has(id))) weights[index] = 0;
    });
  }

  return { candidates, winners, rounds, seats };
}
