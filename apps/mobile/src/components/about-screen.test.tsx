import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AboutScreen from '@/app/about';

describe('AboutScreen', () => {
  it('renders accessible privacy and support resources', () => {
    const html = renderToStaticMarkup(<AboutScreen />);

    expect(html).toContain('Privacy &amp; support');
    expect(html).toContain('Privacy policy');
    expect(html).toContain('Terms of service');
    expect(html).toContain('Contact support');
    expect(html).toContain('Open-source project');
    expect(html.match(/role="link"/g)).toHaveLength(4);
  });
});
