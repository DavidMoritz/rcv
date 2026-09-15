import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BallotTopActions } from './ballot-top-actions';

describe('BallotTopActions', () => {
  it('offers a results action while the voting form is visible', () => {
    const html = renderToStaticMarkup(
      <BallotTopActions
        ballotKey="pizza"
        ballotName="Pizza Contest"
        onViewResults={() => undefined}
        resultsRelease={null}
        resultsVisible={false}
      />,
    );

    expect(html).toContain('View Results');
  });

  it('hides the results action once results are visible', () => {
    const html = renderToStaticMarkup(
      <BallotTopActions
        ballotKey="pizza"
        ballotName="Pizza Contest"
        onViewResults={() => undefined}
        resultsRelease={null}
        resultsVisible
      />,
    );

    expect(html).not.toContain('View Results');
    expect(html).toContain('Share ballot');
  });

  it('hides the results action when resultsRelease is in the future', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const html = renderToStaticMarkup(
      <BallotTopActions
        ballotKey="pizza"
        ballotName="Pizza Contest"
        onViewResults={() => undefined}
        resultsRelease={futureDate}
        resultsVisible={false}
      />,
    );

    expect(html).not.toContain('View Results');
    expect(html).toContain('Share ballot');
  });

  it('shows the results action when resultsRelease is in the past', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const html = renderToStaticMarkup(
      <BallotTopActions
        ballotKey="pizza"
        ballotName="Pizza Contest"
        onViewResults={() => undefined}
        resultsRelease={pastDate}
        resultsVisible={false}
      />,
    );

    expect(html).toContain('View Results');
  });
});
