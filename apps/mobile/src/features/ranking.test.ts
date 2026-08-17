import { describe, expect, it } from 'vitest';

import type { Candidate } from '@/api/legacy-api';

import { createRanking, moveCandidate, removeCandidate, shuffleCandidates } from './ranking';

const candidates: Candidate[] = [
  { id: 1, name: 'Ada', image: '', hyperlink: '', color: null },
  { id: 2, name: 'Grace', image: '', hyperlink: '', color: null },
  { id: 3, name: 'Katherine', image: '', hyperlink: '', color: null },
];

describe('candidate ranking', () => {
  it('preserves server order for ordered ballots without sharing the input array', () => {
    const ranking = createRanking(candidates, true);

    expect(ranking.map((candidate) => candidate.id)).toEqual([1, 2, 3]);
    expect(ranking).not.toBe(candidates);
  });

  it('shuffles unordered ballots without mutating the server response', () => {
    const ranking = shuffleCandidates(candidates, () => 0);

    expect(ranking.map((candidate) => candidate.id)).toEqual([2, 3, 1]);
    expect(candidates.map((candidate) => candidate.id)).toEqual([1, 2, 3]);
  });

  it('moves a candidate one rank at a time', () => {
    expect(moveCandidate(candidates, 2, 'up').map((candidate) => candidate.id)).toEqual([2, 1, 3]);
    expect(moveCandidate(candidates, 2, 'down').map((candidate) => candidate.id)).toEqual([1, 3, 2]);
  });

  it('does not wrap candidates past ranking boundaries', () => {
    expect(moveCandidate(candidates, 1, 'up')).toEqual(candidates);
    expect(moveCandidate(candidates, 3, 'down')).toEqual(candidates);
  });

  it('removes only the selected candidate', () => {
    expect(removeCandidate(candidates, 2).map((candidate) => candidate.id)).toEqual([1, 3]);
    expect(candidates).toHaveLength(3);
  });
});
