import { describe, expect, it } from 'vitest';
import {
  canonicalBallotKey,
  canonicalBallotPath,
  canonicalBallotUrl,
  isLegacyBallotPath
} from '@src/js/utils/ballot-links.js';

describe('canonical ballot links', () => {
  it('builds the canonical path and URL', () => {
    expect(canonicalBallotPath(' pizza ')).toBe('/ballot/pizza');
    expect(canonicalBallotUrl('https://rankedchoices.com/', 'pizza')).toBe(
      'https://rankedchoices.com/ballot/pizza'
    );
  });

  it('extracts a shortcode only from a canonical ballot path', () => {
    expect(canonicalBallotKey('/ballot/pizza')).toBe('pizza');
    expect(canonicalBallotKey('/ballot/pizza/')).toBe('pizza');
    expect(canonicalBallotKey('/results')).toBeNull();
    expect(canonicalBallotKey('/ballot/too/many')).toBeNull();
  });

  it('recognizes the legacy root-shortcode path', () => {
    expect(isLegacyBallotPath('/pizza', 'pizza')).toBe(true);
    expect(isLegacyBallotPath('/ballot/pizza', 'pizza')).toBe(false);
  });
});
