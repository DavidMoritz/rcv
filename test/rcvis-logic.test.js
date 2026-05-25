import { describe, it, expect } from 'vitest';
import {
  shouldPatchGraph,
  shouldAutoUpdate,
  canSeeGraph,
  shouldUsePostCutoffPath
} from '@src/js/utils/rcvis-helpers.js';

/**
 * Pure-logic tests for RCVis graph display decisions.
 * Imports the real implementations from src/js/utils/rcvis-helpers.js.
 */

describe('Graph staleness detection (post-cutoff path)', () => {
  it('is stale when graphUpdated is null', () => {
    expect(shouldPatchGraph({
      rcvisSlug: 'some-slug',
      graphUpdated: null,
      mostRecentVote: '2025-06-01 12:00:00'
    })).toBe(true);
  });

  it('is stale when graphUpdated is before mostRecentVote', () => {
    expect(shouldPatchGraph({
      rcvisSlug: 'some-slug',
      graphUpdated: '2025-01-01 00:00:00',
      mostRecentVote: '2025-06-01 12:00:00'
    })).toBe(true);
  });

  it('is not stale when graphUpdated is after mostRecentVote', () => {
    expect(shouldPatchGraph({
      rcvisSlug: 'some-slug',
      graphUpdated: '2025-07-01 00:00:00',
      mostRecentVote: '2025-06-01 12:00:00'
    })).toBe(false);
  });

  it('is stale when rcvisSlug is empty', () => {
    expect(shouldPatchGraph({
      rcvisSlug: '',
      graphUpdated: '2025-07-01 00:00:00',
      mostRecentVote: '2025-06-01 12:00:00'
    })).toBe(true);
  });
});

describe('Auto-update threshold logic', () => {
  it('triggers when both thresholds met and graph exists', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 20,
      minutesSinceUpdate: 150,
      minVotes: 15,
      minMinutes: 120
    })).toBe(true);
  });

  it('does not trigger when only votes threshold met', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 20,
      minutesSinceUpdate: 60,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });

  it('does not trigger when only time threshold met', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 5,
      minutesSinceUpdate: 150,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });

  it('does not trigger when neither threshold met', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 3,
      minutesSinceUpdate: 30,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });

  it('uses default fallbacks when rcvisInfo fields missing', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 15,
      minutesSinceUpdate: 120,
      minVotes: undefined,
      minMinutes: undefined
    })).toBe(true);
  });

  it('does not trigger when minutesSinceUpdate is null (never updated)', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: 'some-slug',
      votesSinceUpdate: 15,
      minutesSinceUpdate: null,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });

  it('does not trigger when rcvisSlug is missing (no graph yet)', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: '',
      votesSinceUpdate: 20,
      minutesSinceUpdate: 150,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });

  it('does not trigger when rcvisSlug is null', () => {
    expect(shouldAutoUpdate({
      rcvisSlug: null,
      votesSinceUpdate: 20,
      minutesSinceUpdate: 150,
      minVotes: 15,
      minMinutes: 120
    })).toBe(false);
  });
});

describe('Vote cutoff path selection', () => {
  it('uses post-cutoff path when cutoff date has passed', () => {
    expect(shouldUsePostCutoffPath({
      voteCutoffDate: new Date('2025-01-01'),
      now: new Date('2025-06-01')
    })).toBe(true);
  });

  it('does not use post-cutoff path when cutoff is in the future', () => {
    expect(shouldUsePostCutoffPath({
      voteCutoffDate: new Date('2099-01-01'),
      now: new Date('2025-06-01')
    })).toBe(false);
  });

  it('does not use post-cutoff path when voteCutoffDate is null', () => {
    expect(shouldUsePostCutoffPath({
      voteCutoffDate: null,
      now: new Date('2025-06-01')
    })).toBeFalsy();
  });

  it('does not use post-cutoff path when voteCutoffDate is undefined', () => {
    expect(shouldUsePostCutoffPath({
      voteCutoffDate: undefined,
      now: new Date('2025-06-01')
    })).toBeFalsy();
  });
});

describe('Graph visibility for creator with key', () => {
  it('creator with API key can see graph before resultsRelease', () => {
    expect(canSeeGraph({
      resultsDate: new Date('2099-01-01'),
      now: new Date('2025-06-01'),
      isCreator: true,
      rcvisInfo: { apiKey: 'abc123' }
    })).toBe(true);
  });

  it('non-creator cannot see graph before resultsRelease', () => {
    expect(canSeeGraph({
      resultsDate: new Date('2099-01-01'),
      now: new Date('2025-06-01'),
      isCreator: false,
      rcvisInfo: null
    })).toBe(false);
  });

  it('anyone can see graph after resultsRelease', () => {
    expect(canSeeGraph({
      resultsDate: new Date('2020-01-01'),
      now: new Date('2025-06-01'),
      isCreator: false,
      rcvisInfo: null
    })).toBe(true);
  });

  it('anyone can see graph when no resultsDate set', () => {
    expect(canSeeGraph({
      resultsDate: null,
      now: new Date('2025-06-01'),
      isCreator: false,
      rcvisInfo: null
    })).toBe(true);
  });

  it('creator without API key cannot see graph before resultsRelease', () => {
    expect(canSeeGraph({
      resultsDate: new Date('2099-01-01'),
      now: new Date('2025-06-01'),
      isCreator: true,
      rcvisInfo: null
    })).toBe(false);
  });

  it('creator with empty rcvisInfo cannot see graph before resultsRelease', () => {
    expect(canSeeGraph({
      resultsDate: new Date('2099-01-01'),
      now: new Date('2025-06-01'),
      isCreator: true,
      rcvisInfo: {}
    })).toBe(false);
  });
});
