import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BallotReportLink } from './ballot-report-link';

describe('BallotReportLink', () => {
  it('provides an accessible content-reporting mechanism', () => {
    const html = renderToStaticMarkup(<BallotReportLink ballotKey="garden" />);

    expect(html).toContain('Report this ballot');
    expect(html).toContain('role="link"');
  });
});
