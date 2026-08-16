import { calculateElection } from '@rankedchoices/rcv-core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ElectionResultsView } from './election-results';

describe('ElectionResultsView', () => {
  it('renders winners and every local tally round', () => {
    const result = calculateElection({
      candidates: [
        { id: 1, name: 'Ada' },
        { id: 2, name: 'Grace' },
        { id: 3, name: 'Katherine' },
      ],
      ballots: [[1], [1, 2], [2, 1], [3, 2]],
    });
    const html = renderToStaticMarkup(<ElectionResultsView result={result} voteCount={4} />);

    expect(html).toContain('Current results');
    expect(html).toContain('Calculated on this device from 4 votes.');
    expect(html).toContain('Round 1');
    expect(html).toContain(result.winners[0].name);
    expect(html).toContain('Eliminated');
  });
});
