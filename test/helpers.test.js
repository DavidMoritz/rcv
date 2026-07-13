import { describe, it, expect } from 'vitest';
import { trickVote, jsUcfirst, dataFromObj, truncateName } from '@src/js/utils/helpers.js';

describe('trickVote', () => {
  it('equals "123456"', () => {
    expect(trickVote).toBe('123456');
  });
});

describe('jsUcfirst', () => {
  it('capitalizes the first letter', () => {
    expect(jsUcfirst('hello')).toBe('Hello');
  });

  it('keeps the rest of the string as-is', () => {
    expect(jsUcfirst('hELLO')).toBe('HELLO');
  });

  it('handles single character', () => {
    expect(jsUcfirst('a')).toBe('A');
  });

  it('handles empty string', () => {
    expect(jsUcfirst('')).toBe('');
  });
});

describe('dataFromObj', () => {
  it('returns FormData with processing JSON when given a string', () => {
    var data = dataFromObj('My Election');
    expect(data).toBeInstanceOf(FormData);
    var file = data.get('jsonFile');
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('results.json');
  });

  it('wraps an object as JSON in FormData', () => {
    var obj = { config: { contest: 'Test' }, results: [] };
    var data = dataFromObj(obj);
    var file = data.get('jsonFile');
    expect(file).toBeInstanceOf(File);
  });
});

describe('truncateName', () => {
  it('returns short names unchanged', () => {
    expect(truncateName('Alice')).toBe('Alice');
  });

  it('returns names at exactly 12 chars unchanged', () => {
    expect(truncateName('Twelve Chars')).toBe('Twelve Chars');
  });

  it('truncates at first space at or after char 12', () => {
    expect(truncateName('Alexander Hamilton Jr')).toBe('Alexander Hamilton\u2026');
  });

  it('hard-cuts single-word names longer than 18 chars', () => {
    expect(truncateName('Superlongsinglenamehere')).toBe('Superlongsinglenamehere'.slice(0, 18) + '\u2026');
  });

  it('returns single-word names 13-18 chars unchanged', () => {
    expect(truncateName('Thirteenchars')).toBe('Thirteenchars');
  });

  it('handles null/undefined gracefully', () => {
    expect(truncateName(null)).toBe(null);
    expect(truncateName(undefined)).toBe(undefined);
  });

  it('handles empty string', () => {
    expect(truncateName('')).toBe('');
  });
});

describe('String.hashCode', () => {
  it('returns a consistent integer for the same input', () => {
    var hash1 = 'test'.hashCode();
    var hash2 = 'test'.hashCode();
    expect(typeof hash1).toBe('number');
    expect(hash1).toBe(hash2);
  });

  it('returns 0 for empty string', () => {
    expect(''.hashCode()).toBe(0);
  });

  it('produces different hashes for different strings', () => {
    expect('abc'.hashCode()).not.toBe('xyz'.hashCode());
  });
});
