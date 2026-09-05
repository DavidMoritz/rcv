import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BallotShareButton } from './ballot-share-button';

describe('BallotShareButton', () => {
  it('renders an accessible native-share action', () => {
    const html = renderToStaticMarkup(
      <BallotShareButton ballotKey="pizza" ballotName="Pizza night" />,
    );

    expect(html).toContain('aria-label="Share ballot"');
    expect(html).toContain('role="button"');
    expect(html).toContain('Share ballot</div>');
  });
});
