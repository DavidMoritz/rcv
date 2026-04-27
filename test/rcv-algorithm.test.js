import { describe, it, expect, beforeEach } from 'vitest';
import { runElection, getWinnerNames } from './helpers/rcv-test-harness.js';

beforeEach(() => {
  // Reset AJAX stubs between tests
  $.ajax.mockClear();
  $.get.mockClear();
});

describe('RCV Algorithm — Single Seat', () => {
  it('elects candidate with clear majority in round 1', () => {
    const result = runElection({
      candidates: ['Alice', 'Bob', 'Carol'],
      ballots: [
        ['Alice', 'Bob'],
        ['Alice', 'Carol'],
        ['Alice', 'Bob'],
        ['Bob', 'Carol'],
        ['Carol', 'Bob']
      ]
    });

    expect(getWinnerNames(result)).toEqual(['Alice']);
  });

  it('eliminates last-place and redistributes votes', () => {
    // Round 1: Alice=2, Bob=2, Carol=1 → Carol eliminated
    // Round 2: Alice=2, Bob=3 → Bob wins
    const result = runElection({
      candidates: ['Alice', 'Bob', 'Carol'],
      ballots: [
        ['Alice', 'Bob'],
        ['Alice', 'Carol'],
        ['Bob', 'Alice'],
        ['Bob', 'Carol'],
        ['Carol', 'Bob']
      ]
    });

    expect(getWinnerNames(result)).toEqual(['Bob']);
  });

  it('handles multiple rounds of elimination', () => {
    // Round 1: A=3, B=2, C=2, D=1 → D eliminated
    // Round 2: A=3, B=2, C=3 → B eliminated
    // Round 3: A=4, C=4 → tie broken, one wins
    const result = runElection({
      candidates: ['A', 'B', 'C', 'D'],
      ballots: [
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'D'],
        ['B', 'C'],
        ['B', 'A'],
        ['C', 'A'],
        ['C', 'B'],
        ['D', 'C']
      ]
    });

    expect(result.elected).toHaveLength(1);
    expect(['A', 'C']).toContain(getWinnerNames(result)[0]);
  });

  it('elects winner in two-candidate race', () => {
    const result = runElection({
      candidates: ['Alice', 'Bob'],
      ballots: [['Alice'], ['Alice'], ['Bob']]
    });

    expect(getWinnerNames(result)).toEqual(['Alice']);
  });

  it('elects uncontested candidate', () => {
    const result = runElection({
      candidates: ['Alice'],
      ballots: [['Alice'], ['Alice'], ['Alice']]
    });

    expect(getWinnerNames(result)).toEqual(['Alice']);
  });

  it('handles exhausted ballots (no remaining choices)', () => {
    // Round 1: A=2, B=2, C=1 → C eliminated
    // C's voter had no second choice → ballot exhausted
    // Round 2: A=2, B=2 → tie broken
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A', 'B'], ['A'], ['B', 'A'], ['B'], ['C']]
    });

    expect(result.elected).toHaveLength(1);
    expect(['A', 'B']).toContain(getWinnerNames(result)[0]);
  });

  it('handles all single-ranked ballots', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A'], ['A'], ['A'], ['B'], ['C']]
    });

    expect(getWinnerNames(result)).toEqual(['A']);
  });
});

describe('RCV Algorithm — Multi-Seat STV', () => {
  it('elects multiple candidates with surplus transfer', () => {
    // 2 seats, quota = 10/(2+1) = 3.33
    // A has 5 first-choice votes → elected, surplus transferred
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [
        ['A', 'B'],
        ['A', 'B'],
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'C'],
        ['B', 'C'],
        ['B', 'C'],
        ['C', 'B'],
        ['C', 'B'],
        ['C', 'A']
      ],
      seats: 2
    });

    expect(result.elected).toHaveLength(2);
    expect(getWinnerNames(result)).toContain('A');
  });

  it('fills all seats when candidates equal seats', () => {
    const result = runElection({
      candidates: ['A', 'B'],
      ballots: [
        ['A', 'B'],
        ['B', 'A'],
        ['A', 'B']
      ],
      seats: 2
    });

    expect(result.elected).toHaveLength(2);
    const names = getWinnerNames(result);
    expect(names).toContain('A');
    expect(names).toContain('B');
  });

  it('handles vote weight adjustment after surplus', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C', 'D'],
      ballots: [
        ['A', 'B'],
        ['A', 'B'],
        ['A', 'C'],
        ['A', 'D'],
        ['A', 'C'],
        ['B', 'C'],
        ['C', 'D'],
        ['D', 'B']
      ],
      seats: 2
    });

    expect(result.elected).toHaveLength(2);
    expect(getWinnerNames(result)).toContain('A');
  });
});

describe('RCV Algorithm — Tie Breaking', () => {
  it('weighted tiebreak considers subsequent rankings', () => {
    // A=2, B=2 → tie. Weighted tiebreak considers 2nd-place votes.
    // A gets two 2nd-place mentions (from both B voters), B gets one → A wins
    const result = runElection({
      candidates: ['A', 'B'],
      ballots: [
        ['A', 'B'],
        ['A'],
        ['B', 'A'],
        ['B', 'A']
      ],
      tieBreak: 'weighted'
    });

    expect(getWinnerNames(result)).toEqual(['A']);
  });

  it('random tiebreak is deterministic for same inputs', () => {
    const ballots = [['A'], ['A'], ['B'], ['B'], ['C']];
    const opts = { candidates: ['A', 'B', 'C'], ballots, tieBreak: 'random' };

    const result1 = runElection(opts);
    const result2 = runElection(opts);

    // Same inputs → same tie-break outcome (seeded by vote count + name + round)
    expect(getWinnerNames(result1)).toEqual(getWinnerNames(result2));
  });
});

describe('RCV Algorithm — Quota', () => {
  it('computes initial quota as votes/(seats+1)', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A'], ['A'], ['A'], ['B'], ['B'], ['C']],
      seats: 1
    });

    // 6 votes / (1+1) = 3.0
    expect(result.jsonObj.config.threshold).toBeCloseTo(3.0, 1);
  });

  it('uses quota for multi-seat threshold', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A'], ['A'], ['A'], ['B'], ['B'], ['C'], ['C'], ['B'], ['A']],
      seats: 2
    });

    // 9 votes / (2+1) = 3.0
    // Threshold is updated during the election; final value stored
    expect(result.jsonObj.config.threshold).toBeGreaterThan(0);
  });
});

describe('RCV Algorithm — JSON Output (RCVis format)', () => {
  it('produces valid JSON structure with config and results', () => {
    const result = runElection({
      candidates: ['Alice', 'Bob', 'Carol'],
      ballots: [
        ['Alice', 'Bob'],
        ['Alice', 'Carol'],
        ['Alice'],
        ['Bob', 'Carol'],
        ['Carol', 'Bob']
      ]
    });

    const json = result.jsonObj;
    expect(json.config).toBeDefined();
    expect(json.config.contest).toBe('Test Election');
    expect(json.config.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(json.results).toBeInstanceOf(Array);
    expect(json.results.length).toBeGreaterThan(0);
  });

  it('includes tally per round', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A', 'B'], ['A'], ['B', 'C'], ['B', 'A'], ['C', 'A']]
    });

    const firstRound = result.jsonObj.results[0];
    expect(firstRound.round).toBe(1);
    expect(firstRound.tally).toBeDefined();
    expect(Object.keys(firstRound.tally).length).toBeGreaterThan(0);
  });

  it('tracks elected/eliminated per round', () => {
    const result = runElection({
      candidates: ['A', 'B', 'C'],
      ballots: [['A', 'B'], ['A'], ['B', 'C'], ['B', 'A'], ['C', 'A']]
    });

    const rounds = result.jsonObj.results;
    const hasOutcome = rounds.some(
      (r) => r.tallyResults[0].elected || r.tallyResults[0].eliminated
    );
    expect(hasOutcome).toBe(true);
  });
});

describe('RCV Algorithm — Edge Cases', () => {
  it('handles many candidates (10)', () => {
    const candidates = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const ballots = [
      ['A', 'B', 'C'],
      ['A', 'D', 'E'],
      ['A', 'F', 'G'],
      ['B', 'C', 'D'],
      ['B', 'E', 'F'],
      ['C', 'D', 'A'],
      ['D', 'E', 'A'],
      ['E', 'F', 'B'],
      ['F', 'G', 'C'],
      ['G', 'H', 'A'],
      ['H', 'I', 'B'],
      ['I', 'J', 'C'],
      ['J', 'A', 'D']
    ];

    const result = runElection({ candidates, ballots });
    expect(result.elected).toHaveLength(1);
    expect(candidates).toContain(getWinnerNames(result)[0]);
  });

  it('handles many voters (200)', () => {
    const candidates = ['A', 'B', 'C', 'D'];
    const ballots = [];
    // A gets 80, B gets 60, C gets 40, D gets 20
    for (let i = 0; i < 80; i++) ballots.push(['A', 'B', 'C']);
    for (let i = 0; i < 60; i++) ballots.push(['B', 'C', 'A']);
    for (let i = 0; i < 40; i++) ballots.push(['C', 'D', 'A']);
    for (let i = 0; i < 20; i++) ballots.push(['D', 'C', 'B']);

    const result = runElection({ candidates, ballots });
    expect(getWinnerNames(result)).toEqual(['A']);
  });

  it('does not make any network requests', () => {
    runElection({
      candidates: ['A', 'B'],
      ballots: [['A'], ['A'], ['B']]
    });

    expect($.ajax).not.toHaveBeenCalled();
    expect($.get).not.toHaveBeenCalled();
  });
});
