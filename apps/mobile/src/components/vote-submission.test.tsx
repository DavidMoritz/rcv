import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Ballot, Candidate } from '@/api/legacy-api';

import { VoteSubmission } from './vote-submission';

vi.mock('expo-crypto', () => ({ randomUUID: () => 'test-request-id' }));

const ballot: Ballot = {
  id: 1,
  key: 'secure-ballot',
  name: 'Secure ballot',
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
  isSecure: true,
  orderedEntries: true,
  allowGrouping: false,
  createdBy: 'guest',
};

const ranking: Candidate[] = [
  { id: 1, name: 'Ada', image: '', hyperlink: '', color: null },
];

describe('VoteSubmission', () => {
  it('renders an accessible code field and blocks submission until it is complete', () => {
    const html = renderToStaticMarkup(
      <VoteSubmission ballot={ballot} onAccepted={() => undefined} ranking={ranking} />,
    );

    expect(html).toContain('aria-label="Voter code"');
    expect(html).toContain('Enter the six-character voter code');
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*aria-label="Submit vote"/);
  });
});
