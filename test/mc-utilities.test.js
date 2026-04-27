import { describe, it, expect, beforeAll } from 'vitest';

/**
 * mc is a plain object defined at module scope in main.js. The second .run()
 * block assigns it to $rootScope.mc. We extract it via angular.injector which
 * processes the run blocks and makes mc available on $rootScope.
 */

let mc;

beforeAll(() => {
  const injector = angular.injector(['ng', 'mainApp']);
  const $rootScope = injector.get('$rootScope');
  mc = $rootScope.mc;
});

describe('mc.pluralize', () => {
  it('adds "s" to regular words', () => {
    expect(mc.pluralize('cat')).toBe('cats');
    expect(mc.pluralize('dog')).toBe('dogs');
  });

  it('replaces trailing "y" with "ies"', () => {
    expect(mc.pluralize('party')).toBe('parties');
    expect(mc.pluralize('city')).toBe('cities');
  });
});

describe('mc.camelToTitle', () => {
  it('converts camelCase to spaced sentence case', () => {
    // _.capitalize lowercases all but first char, so this is sentence case
    expect(mc.camelToTitle('camelCase')).toBe('Camel case');
    expect(mc.camelToTitle('myVariableName')).toBe('My variable name');
  });

  it('handles single word', () => {
    expect(mc.camelToTitle('hello')).toBe('Hello');
  });
});

describe('mc.calculateAge', () => {
  it('returns correct age for a past date', () => {
    const age = mc.calculateAge('1990-01-01');
    const thisYear = new Date().getFullYear();
    // Age should be thisYear - 1990, give or take 1 depending on month
    expect(age).toBeGreaterThanOrEqual(thisYear - 1991);
    expect(age).toBeLessThanOrEqual(thisYear - 1990);
  });

  it('returns 0 for undefined input', () => {
    expect(mc.calculateAge(undefined)).toBe(0);
  });

  it('returns 0 for empty string', () => {
    expect(mc.calculateAge('')).toBe(0);
  });
});

describe('mc.expandArray', () => {
  it('expands array 3 times by default', () => {
    expect(mc.expandArray([1, 2])).toEqual([1, 2, 1, 2, 1, 2]);
  });

  it('expands array by specified number of times', () => {
    expect(mc.expandArray([1], 5)).toEqual([1, 1, 1, 1, 1]);
  });

  it('returns empty array for empty input', () => {
    expect(mc.expandArray([], 3)).toEqual([]);
  });
});

describe('mc.isAngularObjectEqual', () => {
  it('considers objects equal ignoring $$hashKey', () => {
    const a = { name: 'test', $$hashKey: 'abc' };
    const b = { name: 'test', $$hashKey: 'xyz' };
    expect(mc.isAngularObjectEqual(a, b)).toBe(true);
  });

  it('considers objects unequal when properties differ', () => {
    const a = { name: 'test1' };
    const b = { name: 'test2' };
    expect(mc.isAngularObjectEqual(a, b)).toBe(false);
  });
});

describe('mc.randomDigits', () => {
  it('returns a number within default range', () => {
    const val = mc.randomDigits();
    expect(val).toBeGreaterThanOrEqual(1);
    expect(val).toBeLessThanOrEqual(999);
  });

  it('returns a number within specified range', () => {
    const val = mc.randomDigits(10, 20);
    expect(val).toBeGreaterThanOrEqual(10);
    expect(val).toBeLessThanOrEqual(20);
  });
});

describe('mc.alphabet', () => {
  it('is an array of 26 uppercase letters', () => {
    expect(mc.alphabet).toHaveLength(26);
    expect(mc.alphabet[0]).toBe('A');
    expect(mc.alphabet[25]).toBe('Z');
  });
});
