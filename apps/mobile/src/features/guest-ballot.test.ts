import { describe, expect, it } from 'vitest';

import { validateGuestBallot } from './guest-ballot';

describe('validateGuestBallot', () => {
  it('trims a basic name-and-candidates ballot into an API request', () => {
    expect(validateGuestBallot(' Lunch ', [' Tacos ', 'Salad'])).toEqual({
      ok: true,
      request: { name: 'Lunch', candidates: ['Tacos', 'Salad'] },
    });
  });

  it('requires a name and at least two populated candidates', () => {
    expect(validateGuestBallot(' ', ['Only one'])).toEqual({
      ok: false,
      errors: {
        name: 'Enter a ballot name of 64 characters or fewer.',
        candidates: 'Enter between 2 and 100 candidates.',
        candidateNames: {},
      },
    });
    expect(validateGuestBallot('Lunch', ['', 'Salad'])).toMatchObject({
      ok: false,
      errors: { candidateNames: { 0: expect.any(String) } },
    });
  });

  it('rejects duplicate names without regard to case or surrounding space', () => {
    expect(validateGuestBallot('Lunch', ['Tacos', ' tacos '])).toMatchObject({
      ok: false,
      errors: { candidateNames: { 1: 'Candidate names must be unique.' } },
    });
  });

  it('matches the server text limits and legacy database character boundary', () => {
    expect(validateGuestBallot('a'.repeat(65), ['A', 'B'])).toMatchObject({
      ok: false,
      errors: { name: expect.any(String) },
    });
    expect(validateGuestBallot('Lunch', ['A', 'B\u0000'])).toMatchObject({
      ok: false,
      errors: { candidateNames: { 1: expect.any(String) } },
    });
    expect(validateGuestBallot('Lunch', ['A', '🍕'])).toMatchObject({
      ok: false,
      errors: { candidateNames: { 1: expect.any(String) } },
    });
  });
});
