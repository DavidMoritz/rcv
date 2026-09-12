import { calculateBorda, calculateElection } from '@rankedchoices/rcv-core';
import { describe, expect, it } from 'vitest';

const candidates = ['A', 'B', 'C', 'D'].map((name, index) => ({ id: index + 1, name }));
const ids = Object.fromEntries(candidates.map((candidate) => [candidate.name, candidate.id]));
const ballots = (rankings: string[][]) => rankings.map((ranking) => ranking.map((name) => ids[name]));

describe('calculateElection legacy parity fixtures', () => {
  it('elects a clear single-seat majority', () => {
    const result = calculateElection({
      candidates: candidates.slice(0, 3),
      ballots: ballots([
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'B'],
        ['B', 'C'],
        ['C', 'B'],
      ]),
    });

    expect(result.winners.map((candidate) => candidate.name)).toEqual(['A']);
    expect(result.rounds[0]).toMatchObject({ number: 1, outcome: { type: 'elected' } });
  });

  it('eliminates and redistributes lower choices', () => {
    const result = calculateElection({
      candidates: candidates.slice(0, 3),
      ballots: ballots([
        ['A', 'B'],
        ['A', 'C'],
        ['B', 'A'],
        ['B', 'C'],
        ['C', 'B'],
      ]),
    });

    expect(result.rounds[0].outcome).toMatchObject({ type: 'eliminated', candidateName: 'C' });
    expect(result.winners.map((candidate) => candidate.name)).toEqual(['B']);
  });

  it('uses weighted downstream support to break elimination ties', () => {
    const result = calculateElection({
      candidates: candidates.slice(0, 3),
      ballots: ballots([
        ['A', 'B'],
        ['A', 'B'],
        ['B', 'A'],
        ['C'],
      ]),
      tieBreak: 'weighted',
    });

    expect(result.rounds[0].outcome).toMatchObject({ type: 'eliminated', candidateName: 'C' });
    expect(result.winners.map((candidate) => candidate.name)).toEqual(['A']);
  });

  it('transfers a multi-seat surplus using the legacy quota', () => {
    const result = calculateElection({
      candidates: candidates.slice(0, 2),
      ballots: ballots([
        ['A', 'B'],
        ['A', 'B'],
        ['A', 'B'],
        ['A', 'B'],
      ]),
      seats: 2,
    });

    expect(result.winners.map((candidate) => candidate.name)).toEqual(['A', 'B']);
    expect(result.rounds[0].quota).toBe(1.33);
    expect(result.rounds[1].tally[ids.B]).toBeCloseTo(2.67, 2);
  });

  it('is deterministic for random tie breaks and ignores invalid IDs', () => {
    const input = {
      candidates: candidates.slice(0, 3),
      ballots: [...ballots([['A'], ['A'], ['B'], ['B'], ['C']]), [999, ids.A]],
      tieBreak: 'random' as const,
    };

    expect(calculateElection(input)).toEqual(calculateElection(input));
  });
});

describe('calculateBorda legacy parity fixtures', () => {
  it('awards descending rank points and elects the configured number of candidates', () => {
    const result = calculateBorda({
      candidates,
      ballots: ballots([
        ['A', 'B', 'C', 'D'],
        ['B', 'A', 'C', 'D'],
        ['C', 'A', 'B', 'D'],
      ]),
      seats: 2,
    });

    expect(result.cap).toBe(4);
    expect(result.tally.map(({ name, points }) => [name, points])).toEqual([
      ['A', 7],
      ['B', 6],
      ['C', 5],
      ['D', 0],
    ]);
    expect(result.winners.map((candidate) => candidate.name)).toEqual(['A', 'B']);
  });

  it('uses first-place votes only to resolve a tie spanning the seat boundary', () => {
    const result = calculateBorda({
      candidates: candidates.slice(0, 3),
      ballots: ballots([
        ['A', 'B'],
        ['A', 'B'],
        ['C', 'B'],
        ['C', 'B'],
      ]),
      seats: 2,
    });

    expect(result.tally.map(({ name, points, firstPlaceVotes }) => [name, points, firstPlaceVotes])).toEqual([
      ['A', 4, 2],
      ['C', 4, 2],
      ['B', 4, 0],
    ]);
    expect(result.winners.map((candidate) => candidate.name)).toEqual(['A', 'C']);
    expect(result.tieBreakApplied).toBe(true);
  });

  it('gives no points to unranked choices and reports average rank', () => {
    const result = calculateBorda({
      candidates: candidates.slice(0, 3),
      ballots: ballots([
        ['A', 'B'],
        ['B', 'A'],
        ['A'],
      ]),
    });

    expect(result.tally.find((candidate) => candidate.name === 'A')).toMatchObject({
      points: 5,
      firstPlaceVotes: 2,
      rankCounts: { 1: 2, 2: 1 },
      averageRank: 1.3,
    });
    expect(result.tally.find((candidate) => candidate.name === 'C')).toMatchObject({
      points: 0,
      firstPlaceVotes: 0,
      rankCounts: {},
      averageRank: null,
    });
  });
});
