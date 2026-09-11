import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { TermsAcceptance } from './terms-acceptance';

describe('TermsAcceptance', () => {
  it('describes the content rules and exposes checkbox state', () => {
    let nextAccepted: boolean | undefined;
    const element = TermsAcceptance({
      accepted: true,
      onChange: (accepted) => { nextAccepted = accepted; },
      onOpenTerms: () => undefined,
    });
    const html = renderToStaticMarkup(
      <TermsAcceptance
        accepted
        onChange={() => undefined}
        onOpenTerms={() => undefined}
      />,
    );

    expect(html).toContain('role="checkbox"');
    expect(html).toContain('rights-infringing ballot content');
    expect(html).toContain('Read the Terms of Use');
    expect(html).toContain('role="link"');
    const checkbox = Array.isArray(element.props.children)
      ? element.props.children[0]
      : element.props.children;
    expect(checkbox.props.accessibilityState).toEqual({ checked: true, disabled: false });
    checkbox.props.onPress();
    expect(nextAccepted).toBe(false);
  });
});
