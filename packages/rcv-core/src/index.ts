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

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function deterministicScore(voteCount: number, name: string, index: number, roundNumber: number) {
  const input = `${voteCount}${`${name.slice(0, 12)}${index}`.replace(/\W/g, '')}${roundNumber}`;
  const parsed = Number.parseInt(input, 36);
  const firstTenDigits = Number(String(parsed).slice(0, 10));
  return (firstTenDigits * 9301 + 49297) % 233280;
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
): CandidateId {
  if (tieBreak === 'random') {
    return [...tied]
      .map((id) => ({
        id,
        score: deterministicScore(ballots.length, names.get(id) ?? String(id), ids.indexOf(id), roundNumber),
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
