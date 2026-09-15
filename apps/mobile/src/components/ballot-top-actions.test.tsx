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
        resultsVisible
      />,
    );

    expect(html).not.toContain('View Results');
    expect(html).toContain('Share ballot');
  });
});
