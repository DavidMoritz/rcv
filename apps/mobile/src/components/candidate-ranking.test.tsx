import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { Candidate } from '@/api/legacy-api';

import { CandidateRanking } from './candidate-ranking';

const candidates: Candidate[] = [
  { id: 1, name: 'Ada', image: '', hyperlink: '', color: null },
  { id: 2, name: 'Grace', image: '', hyperlink: '', color: null },
];

describe('CandidateRanking', () => {
  it('renders ranked candidates with accessible actions and boundary states', () => {
    const html = renderToStaticMarkup(
      <CandidateRanking candidates={candidates} orderedEntries={true} />,
    );

    expect(html).toContain('2 choices ranked');
    expect(html).toContain('aria-label="Move Ada up"');
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*aria-label="Move Ada up"/);
    expect(html).toContain('aria-label="Move Grace down"');
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*aria-label="Move Grace down"/);
    expect(html).toContain('aria-label="Remove Ada from ranking"');
    expect(html).toContain('aria-label="Reset candidate ranking"');
  });
});
