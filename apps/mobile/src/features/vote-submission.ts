import type { Ballot } from '@/api/legacy-api';

export type VoteBlocker =
  | 'closed'
  | 'empty_ranking'
  | 'voter_name_required'
  | 'secure_code_required'
  | 'group_answers_required';

export type PendingVoteRequest = {
  submissionKey: string;
  requestId: string;
};

export function getOrCreateVoteRequest(
  pending: PendingVoteRequest | null,
  submissionKey: string,
  createId: () => string,
): PendingVoteRequest {
  return pending?.submissionKey === submissionKey
    ? pending
    : { submissionKey, requestId: createId() };
}

export function normalizeVoterCode(value: string): string {
  return value.trim().toLowerCase().replaceAll('0', 'o').replaceAll('1', 'i');
}

export function parseUtcTimestamp(value: string | null): number | null {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  const timestamp = Date.parse(normalized);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function getVoteBlocker(
  ballot: Ballot,
  rankingCount: number,
  now = Date.now(),
  voterCode = '',
): VoteBlocker | null {
  const cutoff = parseUtcTimestamp(ballot.voteCutoff);
  if (cutoff !== null && now >= cutoff) return 'closed';
  if (ballot.register === 1) return 'voter_name_required';
  if (ballot.isSecure && normalizeVoterCode(voterCode).length !== 6) return 'secure_code_required';
  if (ballot.allowGrouping) return 'group_answers_required';
  if (rankingCount === 0) return 'empty_ranking';
  return null;
}

export function blockerMessage(blocker: VoteBlocker): string {
  switch (blocker) {
    case 'closed':
      return 'Voting has closed for this ballot.';
    case 'empty_ranking':
      return 'Rank at least one choice before submitting.';
    case 'voter_name_required':
      return 'This ballot requires a voter name and is not available in the anonymous flow.';
    case 'secure_code_required':
      return 'Enter the six-character voter code to submit this ballot.';
    case 'group_answers_required':
      return 'This ballot requires voter questions that are not available in the anonymous flow.';
  }
}

export function formatCutoffCountdown(cutoff: string | null, now = Date.now()): string | null {
  const cutoffTime = parseUtcTimestamp(cutoff);
  if (cutoffTime === null) return null;
  const seconds = Math.max(0, Math.ceil((cutoffTime - now) / 1000));
  if (seconds === 0) return 'Voting is closed.';
  if (seconds > 300) return null;

  const minutes = Math.floor(seconds / 60);
  const remainder = String(seconds % 60).padStart(2, '0');
  return `Voting closes in ${minutes}:${remainder}.`;
}
