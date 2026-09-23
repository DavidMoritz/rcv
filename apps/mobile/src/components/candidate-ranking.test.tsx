import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { Candidate } from '@/api/legacy-api';

import { CandidateRanking } from './candidate-ranking';

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>();
  return {
    ...actual,
    Image: ({ source }: { source: { uri: string } }) => <img alt="" src={source.uri} />,
  };
});

const candidates: Candidate[] = [
  {
    id: 1,
    name: 'Ada',
    image: 'https://images.example.test/ada.jpg',
    hyperlink: '',
    color: null,
  },
  { id: 2, name: 'Grace', image: '', hyperlink: '', color: null },
];

describe('CandidateRanking', () => {
  it('renders ranked candidates with accessible actions and boundary states', () => {
    const html = renderToStaticMarkup(
      <CandidateRanking
        candidates={candidates}
        onChange={() => undefined}
        orderedEntries={true}
        ranking={candidates}
      />,
    );

    expect(html).toContain('2 choices ranked');
    expect(html).toContain('aria-label="Move Ada up"');
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*aria-label="Move Ada up"/);
    expect(html).toContain('aria-label="Move Grace down"');
    expect(html).toMatch(/<button[^>]*aria-disabled="true"[^>]*aria-label="Move Grace down"/);
    expect(html).toContain('aria-label="Remove Ada from ranking"');
    expect(html).toContain('aria-label="Reset candidate ranking"');
  });

  it('shows existing candidate images without replacing their accessible names', () => {
    const html = renderToStaticMarkup(
      <CandidateRanking
        candidates={candidates}
        onChange={() => undefined}
        orderedEntries={true}
        ranking={candidates}
      />,
    );

    expect(html).toContain('https://images.example.test/ada.jpg');
    expect(html).toContain('Ada');
    expect(html).toContain('aria-label="Ranking controls for Ada"');
    expect(html.match(/<img/g)).toHaveLength(1);
  });
});
