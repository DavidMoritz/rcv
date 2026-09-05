import { describe, expect, it } from 'vitest';

import type { Ballot } from '@/api/legacy-api';

import {
  blockerMessage,
  formatCutoffCountdown,
  getOrCreateVoteRequest,
  getVoteBlocker,
  normalizeVoterCode,
  parseUtcTimestamp,
} from './vote-submission';

const ballot: Ballot = {
  id: 1,
  key: 'pizza',
  name: 'Pizza',
  positions: 1,
  register: 0,
  resultsRelease: null,
  voteCutoff: null,
  hideNames: false,
  hideDetails: false,
  allowCustom: false,
  showGraph: false,
  kickbackUrl: null,
  iframeUrl: null,
  oneDeviceOneVote: false,
  isSecure: false,
  orderedEntries: true,
  allowGrouping: false,
  createdBy: 'guest',
};

describe('vote submission states', () => {
  it('reuses a request ID only while retrying the same ranking', () => {
    const pending = { submissionKey: '1,2|codeaa', requestId: 'original-id' };

    expect(getOrCreateVoteRequest(pending, '1,2|codeaa', () => 'new-id')).toBe(pending);
    expect(getOrCreateVoteRequest(pending, '1,2|codebb', () => 'new-id')).toEqual({
      submissionKey: '1,2|codebb',
      requestId: 'new-id',
    });
  });

  it('normalizes voter-code case and ambiguous characters', () => {
    expect(normalizeVoterCode(' AbC001 ')).toBe('abcooi');
  });

  it('parses legacy database timestamps as UTC', () => {
    expect(parseUtcTimestamp('2026-08-16 12:00:00')).toBe(Date.parse('2026-08-16T12:00:00Z'));
    expect(parseUtcTimestamp(null)).toBeNull();
  });

  it('blocks cutoff, name, secure, grouped, and empty-ranking states', () => {
    const now = Date.parse('2026-08-16T12:00:00Z');

    expect(getVoteBlocker({ ...ballot, voteCutoff: '2026-08-16 11:59:59' }, 2, now)).toBe('closed');
    expect(getVoteBlocker({ ...ballot, register: 1 }, 2, now)).toBe('voter_name_required');
    expect(getVoteBlocker({ ...ballot, isSecure: true }, 2, now, 'short')).toBe('secure_code_required');
    expect(getVoteBlocker({ ...ballot, isSecure: true }, 2, now, 'ABC001')).toBeNull();
    expect(getVoteBlocker({ ...ballot, allowGrouping: true }, 2, now)).toBe('group_answers_required');
    expect(getVoteBlocker(ballot, 0, now)).toBe('empty_ranking');
    expect(getVoteBlocker(ballot, 2, now)).toBeNull();
  });

  it('formats the final five-minute cutoff warning', () => {
    const now = Date.parse('2026-08-16T12:00:00Z');

    expect(formatCutoffCountdown('2026-08-16 12:04:09', now)).toBe('Voting closes in 4:09.');
    expect(formatCutoffCountdown('2026-08-16 13:00:00', now)).toBeNull();
    expect(formatCutoffCountdown('2026-08-16 11:59:59', now)).toBe('Voting is closed.');
    expect(blockerMessage('secure_code_required')).toContain('voter code');
  });
});
