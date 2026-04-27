import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dateToTime, roundResultsRelease, updateTime, initBallot } from '@src/js/ballot.js';

// moment-timezone is CDN-loaded in production; stub .tz() for tests
if (!moment.tz) {
  moment.tz = { guess: () => 'UTC' };
  var origMoment = moment;
  var wrappedMoment = function () {
    var m = origMoment.apply(null, arguments);
    if (!m.tz) {
      m.tz = function () { return m; };
    }
    return m;
  };
  Object.assign(wrappedMoment, origMoment);
  globalThis.moment = wrappedMoment;
}

describe('dateToTime', () => {
  it('converts a Date to {hour, minute, meridian}', () => {
    var d = new Date(2024, 0, 1, 14, 30); // 2:30 PM
    expect(dateToTime(d)).toEqual({ hour: 2, minute: 30, meridian: 'PM' });
  });

  it('handles midnight (12 AM)', () => {
    var d = new Date(2024, 0, 1, 0, 0);
    expect(dateToTime(d)).toEqual({ hour: 12, minute: 0, meridian: 'AM' });
  });

  it('handles noon (12 PM)', () => {
    var d = new Date(2024, 0, 1, 12, 0);
    expect(dateToTime(d)).toEqual({ hour: 12, minute: 0, meridian: 'PM' });
  });

  it('rounds minutes to nearest 5', () => {
    var d = new Date(2024, 0, 1, 9, 13); // 13 → rounds to 15
    expect(dateToTime(d).minute).toBe(15);
  });

  it('caps minutes at 55 when rounding up from 58+', () => {
    var d = new Date(2024, 0, 1, 9, 58); // 58 → rounds to 60, capped at 55
    expect(dateToTime(d).minute).toBe(55);
  });

  it('handles 1 AM', () => {
    var d = new Date(2024, 0, 1, 1, 0);
    expect(dateToTime(d)).toEqual({ hour: 1, minute: 0, meridian: 'AM' });
  });
});

describe('roundResultsRelease', () => {
  it('returns a Date in the future', () => {
    var now = new Date();
    var result = roundResultsRelease();
    expect(result).toBeInstanceOf(Date);
    expect(result.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('returns minutes on a 15-minute boundary', () => {
    var result = roundResultsRelease();
    expect(result.getMinutes() % 15).toBe(0);
  });

  it('has seconds set to 0', () => {
    var result = roundResultsRelease();
    expect(result.getSeconds()).toBe(0);
  });
});

describe('updateTime', () => {
  it('returns ISO-like string in YYYY-MM-DD HH:mm:ss format', () => {
    var d = new Date(2024, 5, 15, 14, 30, 0); // June 15, 2024 2:30 PM
    var result = updateTime(d, 'UTC');
    // Should match pattern YYYY-MM-DD HH:mm:ss
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });
});

describe('initBallot scope setup', () => {
  var $s;

  beforeEach(() => {
    $s = {
      ballot: {},
      errors: {},
      success: {},
      user: {},
      $watch: vi.fn()
    };
    var $http = vi.fn();
    $http.get = vi.fn();
    initBallot($s, $http);
  });

  it('initializes hours array with 12 entries starting at 12', () => {
    expect($s.hours).toEqual([12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('initializes minutes array with 12 five-minute increments', () => {
    expect($s.minutes).toHaveLength(12);
    expect($s.minutes[0]).toEqual({ value: 0, label: '00' });
    expect($s.minutes[1]).toEqual({ value: 5, label: '05' });
    expect($s.minutes[11]).toEqual({ value: 55, label: '55' });
  });

  it('registers $watch for ballot.voteCutoff and ballot.resultsRelease', () => {
    var watchCalls = $s.$watch.mock.calls.map(function (c) { return c[0]; });
    expect(watchCalls).toContain('ballot.voteCutoff');
    expect(watchCalls).toContain('ballot.resultsRelease');
  });
});

describe('syncTimeToDate', () => {
  var $s;

  beforeEach(() => {
    $s = {
      ballot: {
        voteCutoff: new Date(2024, 5, 15, 10, 0, 0)
      },
      errors: {},
      success: {},
      user: {},
      $watch: vi.fn()
    };
    var $http = vi.fn();
    $http.get = vi.fn();
    initBallot($s, $http);
  });

  it('updates ballot date from time picker values (PM)', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 3, minute: 30, meridian: 'PM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(15);
    expect(d.getMinutes()).toBe(30);
  });

  it('updates ballot date from time picker values (AM)', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 9, minute: 0, meridian: 'AM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
  });

  it('handles 12 PM (noon) correctly', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 12, minute: 0, meridian: 'PM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(12);
  });

  it('handles 12 AM (midnight) correctly', () => {
    $s.syncTimeToDate('voteCutoff', { hour: 12, minute: 0, meridian: 'AM' });
    var d = new Date($s.ballot.voteCutoff);
    expect(d.getHours()).toBe(0);
  });
});
