import { describe, expect, it } from 'vitest';

import {
  ballotShareContent,
  ballotShareOptions,
  canonicalBallotUrl,
} from './ballot-sharing';

describe('canonicalBallotUrl', () => {
  it('trims and safely encodes the shortcode in the canonical ballot route', () => {
    expect(canonicalBallotUrl(' pizza night ')).toBe(
      'https://rankedchoices.com/ballot/pizza%20night',
    );
    expect(canonicalBallotUrl('team/choice')).toBe(
      'https://rankedchoices.com/ballot/team%2Fchoice',
    );
  });
});

describe('ballot share payload', () => {
  it('includes the canonical URL in cross-platform message and URL fields', () => {
    expect(ballotShareContent(' Pizza night ', 'pizza')).toEqual({
      message: 'Vote in “Pizza night” on Ranked Choices: https://rankedchoices.com/ballot/pizza',
      title: 'Share Pizza night',
      url: 'https://rankedchoices.com/ballot/pizza',
    });
    expect(ballotShareOptions(' Pizza night ')).toEqual({
      dialogTitle: 'Share Pizza night',
      subject: 'Vote in Pizza night',
    });
  });
});
