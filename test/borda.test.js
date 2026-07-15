import { describe, it, expect } from 'vitest';
import { computeBorda } from '@src/js/utils/borda.js';

function makeEntryMap(names) {
  var map = {};
  names.forEach(function (name, i) {
    map[i + 1] = { name: name, image: '', color: '', hyperlink: '' };
  });
  return map;
}

describe('computeBorda', () => {
  it('awards correct points for a single vote', () => {
    // 3 candidates: 1st gets 2 pts, 2nd gets 1 pt, 3rd gets 0 pts
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [[1, 2, 3]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.winner.name).toBe('Alice');
    expect(result.tally[0].points).toBe(2);
    expect(result.tally[1].points).toBe(1);
    expect(result.tally[2].points).toBe(0);
  });

  it('sums points across multiple votes', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [
      [1, 2, 3], // Alice=2, Bob=1, Carol=0
      [2, 1, 3], // Bob=2, Alice=1, Carol=0
      [2, 3, 1]  // Bob=2, Carol=1, Alice=0
    ];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.winner.name).toBe('Bob');
    expect(result.tally.find(t => t.name === 'Bob').points).toBe(5);
    expect(result.tally.find(t => t.name === 'Alice').points).toBe(3);
    expect(result.tally.find(t => t.name === 'Carol').points).toBe(1);
  });

  it('gives 0 points to unranked candidates', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    // Vote only ranks Alice and Bob
    var votes = [[1, 2]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally.find(t => t.name === 'Carol').points).toBe(0);
    expect(result.tally.find(t => t.name === 'Alice').points).toBe(2);
    expect(result.tally.find(t => t.name === 'Bob').points).toBe(1);
  });

  it('calculates percentages correctly', () => {
    var ids = [1, 2];
    var entryMap = makeEntryMap(['Alice', 'Bob']);
    // 2 candidates, 1 vote: max points = 1 * 1 = 1
    var votes = [[1, 2]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally[0].percent).toBe(100);
    expect(result.tally[1].percent).toBe(0);
  });

  it('breaks ties by most first-place votes', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [
      [1, 2, 3], // Alice=2, Bob=1, Carol=0
      [2, 1, 3], // Bob=2, Alice=1, Carol=0
      [3, 1, 2]  // Carol=2, Alice=1, Bob=0
    ];
    // Alice: 4pts, 1 first. Bob: 3pts, 1 first. Carol: 2pts, 1 first.
    // No tie here, but let's test an actual tie:
    var tiedVotes = [
      [1, 2], // Alice 1st
      [1, 2], // Alice 1st
      [2, 1], // Bob 1st
    ];
    var tiedIds = [1, 2];
    var tiedMap = makeEntryMap(['Alice', 'Bob']);
    // Alice: 2pts (1+1), 2 firsts. Bob: 1pt (0+0+1), 1 first. Not tied.

    // True points tie with different firsts:
    var votes2 = [
      [1, 2, 3], // Alice=2, Bob=1
      [2, 3, 1], // Bob=2, Carol=1
      [3, 1, 2]  // Carol=2, Alice=1
    ];
    // Alice=3, Bob=3, Carol=3 — all tied on points
    // Alice: 1 first, Bob: 1 first, Carol: 1 first — still tied
    var result2 = computeBorda(votes2, ids, entryMap);
    expect(result2.tally[0].points).toBe(3);
    expect(result2.tally[1].points).toBe(3);
    expect(result2.tally[2].points).toBe(3);
  });

  it('ranks candidate with more first-place votes higher when points are equal', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    // Alice: 2+0 = 2pts, 1 first
    // Bob:   1+1 = 2pts, 0 firsts
    // Carol: 0+2 = 2pts, 1 first
    var votes = [
      [1, 2, 3], // Alice=2, Bob=1, Carol=0
      [3, 2, 1]  // Carol=2, Bob=1, Alice=0
    ];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally[0].points).toBe(2);
    expect(result.tally[1].points).toBe(2);
    expect(result.tally[2].points).toBe(2);
    // Alice and Carol each have 1 first-place vote, Bob has 0
    expect(result.tally[2].name).toBe('Bob');
    expect(result.tally[2].firstPlaceVotes).toBe(0);
  });

  it('tracks firstPlaceVotes in tally entries', () => {
    var ids = [1, 2];
    var entryMap = makeEntryMap(['Alice', 'Bob']);
    var votes = [
      [1, 2],
      [1, 2],
      [2, 1]
    ];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally.find(t => t.name === 'Alice').firstPlaceVotes).toBe(2);
    expect(result.tally.find(t => t.name === 'Bob').firstPlaceVotes).toBe(1);
  });

  it('returns sorted tally by points descending', () => {
    var ids = [1, 2, 3, 4];
    var entryMap = makeEntryMap(['A', 'B', 'C', 'D']);
    var votes = [
      [4, 3, 2, 1], // D=3, C=2, B=1, A=0
      [4, 3, 1, 2]  // D=3, C=2, A=1, B=0
    ];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally[0].name).toBe('D');
    expect(result.tally[1].name).toBe('C');
  });

  it('handles empty votes array', () => {
    var ids = [1, 2];
    var entryMap = makeEntryMap(['Alice', 'Bob']);

    var result = computeBorda([], ids, entryMap);

    expect(result.tally[0].points).toBe(0);
    expect(result.tally[1].points).toBe(0);
    expect(result.tally[0].percent).toBe(0);
  });

  it('handles single candidate', () => {
    var ids = [1];
    var entryMap = makeEntryMap(['Alice']);
    var votes = [[1]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.winner.name).toBe('Alice');
    expect(result.winner.points).toBe(0); // n-1 = 0 for single candidate
  });

  it('handles missing entryMap entries gracefully', () => {
    var ids = [1, 2];
    var entryMap = { 1: { name: 'Alice', image: '', color: '', hyperlink: '' } };
    var votes = [[1, 2]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally[0].name).toBe('Alice');
    expect(result.tally[1].name).toBe('2'); // Falls back to string ID
  });

  it('computes rankCounts for each candidate', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [
      [1, 2, 3], // Alice=1st, Bob=2nd, Carol=3rd
      [2, 1, 3], // Bob=1st, Alice=2nd, Carol=3rd
      [1, 3, 2]  // Alice=1st, Carol=2nd, Bob=3rd
    ];

    var result = computeBorda(votes, ids, entryMap);

    var alice = result.tally.find(t => t.name === 'Alice');
    expect(alice.rankCounts).toEqual({ 1: 2, 2: 1 });

    var bob = result.tally.find(t => t.name === 'Bob');
    expect(bob.rankCounts).toEqual({ 1: 1, 2: 1, 3: 1 });

    var carol = result.tally.find(t => t.name === 'Carol');
    expect(carol.rankCounts).toEqual({ 2: 1, 3: 2 });
  });

  it('computes avgRank correctly', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [
      [1, 2, 3], // Alice=1st, Bob=2nd, Carol=3rd
      [2, 1, 3], // Bob=1st, Alice=2nd, Carol=3rd
      [1, 3, 2]  // Alice=1st, Carol=2nd, Bob=3rd
    ];

    var result = computeBorda(votes, ids, entryMap);

    var alice = result.tally.find(t => t.name === 'Alice');
    // (1+2+1)/3 = 1.333 → 1.3
    expect(alice.avgRank).toBe(1.3);

    var bob = result.tally.find(t => t.name === 'Bob');
    // (1+2+3)/3 = 2
    expect(bob.avgRank).toBe(2);

    var carol = result.tally.find(t => t.name === 'Carol');
    // (3+3+2)/3 = 2.667 → 2.7
    expect(carol.avgRank).toBe(2.7);
  });

  it('excludes unranked candidates from avgRank', () => {
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    // Only rank Alice and Bob, Carol is unranked
    var votes = [
      [1, 2],
      [2, 1]
    ];

    var result = computeBorda(votes, ids, entryMap);

    var carol = result.tally.find(t => t.name === 'Carol');
    expect(carol.rankCounts).toEqual({});
    expect(carol.avgRank).toBeNull();

    var alice = result.tally.find(t => t.name === 'Alice');
    // (1+2)/2 = 1.5
    expect(alice.avgRank).toBe(1.5);
  });

  it('does not tie-break above the seat boundary in multi-seat', () => {
    var ids = [1, 2, 3, 4];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol', 'Dave']);
    // Alice=5pts 1 first, Bob=5pts 2 firsts, Carol=3pts, Dave=2pts
    var votes = [
      [1, 2, 3, 4], // Alice=3, Bob=2, Carol=1, Dave=0
      [2, 1, 3, 4], // Bob=3, Alice=2, Carol=1, Dave=0
      [2, 1, 4, 3], // Bob=3, Alice=2, Dave=1, Carol=0
    ];
    // Alice: 3+2+2=7, 1 first. Bob: 2+3+3=8, 2 firsts. Carol: 1+1+0=2. Dave: 0+0+1=1.
    // seats=2: top 2 are Bob(8) and Alice(7) — no tie at boundary, no tieBreak
    var result = computeBorda(votes, ids, entryMap, 2);
    expect(result.tieBreakApplied).toBe(false);
    expect(result.tally[0].name).toBe('Bob');
    expect(result.tally[1].name).toBe('Alice');
  });

  it('applies tie-break only at seat boundary in multi-seat', () => {
    // 3 candidates, seats=2, all tied at 2 points
    // Alice: 1 first, Bob: 0 firsts, Carol: 1 first
    // Tie-break at seat boundary pushes Bob (0 firsts) to last
    var ids = [1, 2, 3];
    var entryMap = makeEntryMap(['Alice', 'Bob', 'Carol']);
    var votes = [
      [1, 2, 3], // Alice=2, Bob=1, Carol=0
      [3, 2, 1], // Carol=2, Bob=1, Alice=0
    ];

    var result = computeBorda(votes, ids, entryMap, 2);
    expect(result.tieBreakApplied).toBe(true);
    expect(result.tally[2].name).toBe('Bob');
    expect(result.tally[2].firstPlaceVotes).toBe(0);
  });

  it('caps points at min(n, max(seats, 10)) for large fields', () => {
    // 15 candidates, 1 seat → cap = min(15, max(1, 10)) = 10
    // 1st place gets 9 pts, 10th gets 0, 11th+ gets 0
    var ids = [];
    var names = [];
    for (var i = 1; i <= 15; i++) {
      ids.push(i);
      names.push('C' + i);
    }
    var entryMap = makeEntryMap(names);
    // One vote ranking all 15
    var vote = ids.slice(); // [1,2,...,15]
    var result = computeBorda([vote], ids, entryMap, 1);

    expect(result.cap).toBe(10);
    expect(result.tally.find(t => t.name === 'C1').points).toBe(9);  // cap-1
    expect(result.tally.find(t => t.name === 'C10').points).toBe(0); // cap-1-9 = 0
    expect(result.tally.find(t => t.name === 'C11').points).toBe(0); // beyond cap
    expect(result.tally.find(t => t.name === 'C15').points).toBe(0); // beyond cap
  });

  it('raises cap when seats exceed 10', () => {
    // 20 candidates, 15 seats → cap = min(20, max(15, 10)) = 15
    var ids = [];
    var names = [];
    for (var i = 1; i <= 20; i++) {
      ids.push(i);
      names.push('C' + i);
    }
    var entryMap = makeEntryMap(names);
    var vote = ids.slice();
    var result = computeBorda([vote], ids, entryMap, 15);

    expect(result.cap).toBe(15);
    expect(result.tally.find(t => t.name === 'C1').points).toBe(14);  // cap-1
    expect(result.tally.find(t => t.name === 'C15').points).toBe(0);  // cap-1-14 = 0
    expect(result.tally.find(t => t.name === 'C16').points).toBe(0);  // beyond cap
  });

  it('cap does not exceed number of candidates', () => {
    // 5 candidates, 1 seat → cap = min(5, max(1, 10)) = 5
    var ids = [1, 2, 3, 4, 5];
    var entryMap = makeEntryMap(['A', 'B', 'C', 'D', 'E']);
    var vote = [1, 2, 3, 4, 5];
    var result = computeBorda([vote], ids, entryMap, 1);

    expect(result.cap).toBe(5);
    expect(result.tally.find(t => t.name === 'A').points).toBe(4); // normal n-1
  });

  it('preserves image and color in tally', () => {
    var ids = [1];
    var entryMap = { 1: { name: 'Alice', image: 'alice.png', color: 'ff0000', hyperlink: '' } };
    var votes = [[1]];

    var result = computeBorda(votes, ids, entryMap);

    expect(result.tally[0].image).toBe('alice.png');
    expect(result.tally[0].color).toBe('ff0000');
  });
});
