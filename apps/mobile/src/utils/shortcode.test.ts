import { describe, expect, it } from 'vitest';

import { normalizeShortcode } from './shortcode';

describe('normalizeShortcode', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeShortcode('  pizza  ')).toBe('pizza');
  });

  it('keeps an empty shortcode empty', () => {
    expect(normalizeShortcode('   ')).toBe('');
  });
});
