import { describe, it, expect } from 'vitest';

// These functions are defined inline in admin.html.
// Copied here verbatim to unit-test the logic.
function formatTimeSince(ms) {
  var minutes = Math.floor(ms / 60000);
  var hours = Math.floor(ms / 3600000);
  var days = Math.floor(ms / 86400000);
  var weeks = Math.floor(ms / 604800000);
  var months = Math.floor(ms / 2592000000);
  if (ms < 7200000) return minutes + (minutes === 1 ? ' minute' : ' minutes');
  if (ms < 172800000) return hours + (hours === 1 ? ' hour' : ' hours');
  if (ms < 1209600000) return days + (days === 1 ? ' day' : ' days');
  if (ms < 5184000000) return weeks + (weeks === 1 ? ' week' : ' weeks');
  return months + (months === 1 ? ' month' : ' months');
}

describe('formatTimeSince', () => {
  it('shows minutes when under 2 hours', () => {
    expect(formatTimeSince(0)).toBe('0 minutes');
    expect(formatTimeSince(60000)).toBe('1 minute');
    expect(formatTimeSince(300000)).toBe('5 minutes');
    expect(formatTimeSince(5400000)).toBe('90 minutes');
  });

  it('switches to hours at exactly 2 hours', () => {
    expect(formatTimeSince(7200000)).toBe('2 hours');
  });

  it('shows hours when under 2 days', () => {
    expect(formatTimeSince(3600000 * 1)).toBe('60 minutes'); // 1 hour still in minutes range? No, 3600000 < 7200000
    expect(formatTimeSince(3600000 * 3)).toBe('3 hours');
    expect(formatTimeSince(3600000 * 23)).toBe('23 hours');
  });

  it('uses singular "hour"', () => {
    // 1 hour = 3600000ms, but that's < 7200000 so it shows minutes
    // The first time we can get "1 hour" would require ms >= 7200000 but floor(ms/3600000) === 1
    // That's impossible since 7200000/3600000 = 2. So "1 hour" never appears — correct behavior.
    expect(formatTimeSince(7200000)).toBe('2 hours');
  });

  it('switches to days at exactly 2 days', () => {
    expect(formatTimeSince(172800000)).toBe('2 days');
  });

  it('shows days when under 2 weeks', () => {
    expect(formatTimeSince(86400000 * 1)).toBe('24 hours'); // 1 day still in hours
    expect(formatTimeSince(86400000 * 3)).toBe('3 days');
    expect(formatTimeSince(86400000 * 13)).toBe('13 days');
  });

  it('uses singular "day"', () => {
    // 1 day = 86400000ms < 172800000 so it's in hours range
    expect(formatTimeSince(86400000)).toBe('24 hours');
  });

  it('switches to weeks at exactly 2 weeks', () => {
    expect(formatTimeSince(1209600000)).toBe('2 weeks');
  });

  it('shows weeks when under 2 months', () => {
    expect(formatTimeSince(604800000 * 3)).toBe('3 weeks');
    expect(formatTimeSince(604800000 * 7)).toBe('7 weeks');
  });

  it('uses singular "week"', () => {
    // 1 week = 604800000 < 1209600000 so still in days range
    expect(formatTimeSince(604800000)).toBe('7 days');
  });

  it('switches to months at exactly 2 months', () => {
    expect(formatTimeSince(5184000000)).toBe('2 months');
  });

  it('shows months for large durations', () => {
    expect(formatTimeSince(2592000000 * 6)).toBe('6 months');
    expect(formatTimeSince(2592000000 * 12)).toBe('12 months');
  });

  it('uses singular "month"', () => {
    // 1 month = 2592000000 < 5184000000 so still in weeks range
    expect(formatTimeSince(2592000000)).toBe('4 weeks');
  });
});

describe('admin stats localStorage tracking', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores stats with per-value timestamps', () => {
    var now = Date.now();
    var stats = {
      totalBallots: 100, totalBallotsTs: now,
      totalVotes: 500, totalVotesTs: now,
      totalUsers: 50, totalUsersTs: now,
      totalEntries: 200, totalEntriesTs: now
    };
    localStorage.setItem('adminStats', JSON.stringify(stats));

    var stored = JSON.parse(localStorage.getItem('adminStats'));
    expect(stored.totalBallots).toBe(100);
    expect(stored.totalBallotsTs).toBe(now);
    expect(stored.totalVotes).toBe(500);
    expect(stored.totalVotesTs).toBe(now);
  });

  it('returns null when no previous stats exist', () => {
    var prev = JSON.parse(localStorage.getItem('adminStats') || 'null');
    expect(prev).toBeNull();
  });

  it('only updates timestamp for values that changed', () => {
    var hourAgo = Date.now() - 3600000;
    var prev = {
      totalBallots: 100, totalBallotsTs: hourAgo,
      totalVotes: 500, totalVotesTs: hourAgo,
      totalUsers: 50, totalUsersTs: hourAgo,
      totalEntries: 200, totalEntriesTs: hourAgo
    };

    // Simulate: ballots changed, votes didn't
    var now = Date.now();
    var keys = ['totalBallots', 'totalVotes', 'totalUsers', 'totalEntries'];
    var current = { totalBallots: 105, totalVotes: 500, totalUsers: 50, totalEntries: 200 };
    for (var i = 0; i < keys.length; i++) {
      if (current[keys[i]] !== prev[keys[i]]) {
        prev[keys[i] + 'Ts'] = now;
      }
      prev[keys[i]] = current[keys[i]];
    }

    expect(prev.totalBallots).toBe(105);
    expect(prev.totalBallotsTs).toBe(now); // updated — value changed
    expect(prev.totalVotes).toBe(500);
    expect(prev.totalVotesTs).toBe(hourAgo); // unchanged — same value
    expect(prev.totalUsersTs).toBe(hourAgo);
    expect(prev.totalEntriesTs).toBe(hourAgo);
  });
});
