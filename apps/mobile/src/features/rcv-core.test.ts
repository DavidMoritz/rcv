import { calculateElection } from '@rankedchoices/rcv-core';
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
