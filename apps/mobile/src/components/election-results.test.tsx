import { calculateBorda, calculateElection } from '@rankedchoices/rcv-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  BordaResultsView,
  calculateLocalResult,
  ElectionResultsView,
  getWithdrawnCandidates,
} from './election-results';

describe('ElectionResultsView', () => {
  it('renders winners and every local tally round', () => {
    const result = calculateElection({
      candidates: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Grace' },
        { id: 3, name: 'Katherine' },
      ],
      ballots: [[1], [1, 2], [2, 1], [3, 2]],
    });
    const html = renderToStaticMarkup(<ElectionResultsView result={result} voteCount={4} />);

    expect(html).toContain('Current results');
    expect(html).toContain('Calculated on this device from 4 votes.');
    expect(html).toContain('Round 1');
    expect(html).toContain(result.winners[0].name);
    expect(html).toContain('Eliminated');
  });
});

describe('BordaResultsView', () => {
  it('renders native Borda winners, scoring guidance, and point totals without RCV rounds', () => {
    const result = calculateBorda({
      candidates: [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Supreme' },
        { id: 3, name: 'Sausage' },
      ],
      ballots: [[1, 2, 3], [1, 3, 2], [2, 3, 1]],
      seats: 2,
    });
    const html = renderToStaticMarkup(<BordaResultsView result={result} voteCount={3} />);

    expect(html).toContain('using Borda count');
    expect(html).toContain('How Borda count works');
    expect(html).toContain('Point totals');
    expect(html).toContain('Pepperoni');
    expect(html).toContain('4 pts');
    expect(html).not.toContain('Round 1');
  });

  it('selects Borda calculation when the server marks the ballot as Borda', () => {
    const local = calculateLocalResult({
      ballot: {
        key: 'pizza',
        name: 'Pizza Contest',
        positions: 2,
        resultMethod: 'borda',
        tieBreak: 'weighted',
      },
      candidates: [
        { id: 1, name: 'Pepperoni' },
        { id: 2, name: 'Supreme' },
        { id: 3, name: 'Sausage' },
      ],
      votes: [[1, 2, 3], [2, 1, 3]],
    });

    expect(local.resultMethod).toBe('borda');
    expect(local.result).toHaveProperty('tally');
    expect(local.result).not.toHaveProperty('rounds');
  });

  it('preserves round-based calculation for RCV ballots', () => {
    const local = calculateLocalResult({
      ballot: {
        key: 'ordinary',
        name: 'Ordinary ballot',
        positions: 1,
        resultMethod: 'rcv',
        tieBreak: 'weighted',
      },
      candidates: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      votes: [[1, 2], [1, 2], [2, 1]],
    });

    expect(local.resultMethod).toBe('rcv');
    expect(local.result).toHaveProperty('rounds');
    expect(local.result).not.toHaveProperty('tally');
  });
});

describe('candidate withdrawal', () => {
  it('getWithdrawnCandidates returns only withdrawn candidates', () => {
    const withdrawn = getWithdrawnCandidates({
      ballot: { key: 'w', name: 'W', positions: 1, resultMethod: 'rcv', tieBreak: 'weighted' },
      candidates: [
        { id: 1, name: 'Alice', withdrawnAt: null, withdrawnReason: '' },
        { id: 2, name: 'Bob', withdrawnAt: '2024-06-01 00:00:00', withdrawnReason: 'Won president' },
        { id: 3, name: 'Carol', withdrawnAt: null, withdrawnReason: '' },
      ],
      votes: [[1, 2, 3]],
    });
    expect(withdrawn).toHaveLength(1);
    expect(withdrawn[0]).toEqual({ id: 2, name: 'Bob', reason: 'Won president' });
  });

  it('calculateLocalResult filters withdrawn candidates from election', () => {
    const local = calculateLocalResult({
      ballot: { key: 'w2', name: 'W2', positions: 1, resultMethod: 'rcv', tieBreak: 'weighted' },
      candidates: [
        { id: 1, name: 'Alice', withdrawnAt: null, withdrawnReason: '' },
        { id: 2, name: 'Bob', withdrawnAt: '2024-06-01 00:00:00', withdrawnReason: 'Dropped out' },
        { id: 3, name: 'Carol', withdrawnAt: null, withdrawnReason: '' },
      ],
      votes: [[2, 1, 3], [1, 3], [3, 1]],
    });
    expect(local.resultMethod).toBe('rcv');
    // Bob should not appear in the result candidates
    const resultCandidateIds = local.result.candidates.map((c) => c.id);
    expect(resultCandidateIds).not.toContain(2);
    expect(resultCandidateIds).toContain(1);
    expect(resultCandidateIds).toContain(3);
  });

  it('calculateLocalResult filters withdrawn from Borda', () => {
    const local = calculateLocalResult({
      ballot: { key: 'w3', name: 'W3', positions: 1, resultMethod: 'borda', tieBreak: 'weighted' },
      candidates: [
        { id: 1, name: 'Alice', withdrawnAt: null, withdrawnReason: '' },
        { id: 2, name: 'Bob', withdrawnAt: '2024-06-01 00:00:00', withdrawnReason: 'Withdrawn' },
        { id: 3, name: 'Carol', withdrawnAt: null, withdrawnReason: '' },
      ],
      votes: [[2, 1, 3], [1, 3, 2], [3, 1, 2]],
    });
    expect(local.resultMethod).toBe('borda');
    const tallyIds = local.result.tally.map((c) => c.id);
    expect(tallyIds).not.toContain(2);
  });
});
