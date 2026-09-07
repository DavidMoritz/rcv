import { describe, expect, it } from 'vitest';

import {
  PRIVACY_POLICY_URL,
  SOURCE_CODE_URL,
  SUPPORT_EMAIL,
  SUPPORT_URL,
  TERMS_OF_SERVICE_URL,
} from './service-links';

describe('service links', () => {
  it('uses public HTTPS pages for legal and source information', () => {
    expect(new URL(PRIVACY_POLICY_URL)).toMatchObject({
      hostname: 'rankedchoices.com',
      pathname: '/privacy-policy.html',
      protocol: 'https:',
    });
    expect(new URL(TERMS_OF_SERVICE_URL)).toMatchObject({
      hostname: 'rankedchoices.com',
      pathname: '/terms-of-service.html',
      protocol: 'https:',
    });
    expect(new URL(SOURCE_CODE_URL)).toMatchObject({
      hostname: 'github.com',
      protocol: 'https:',
    });
  });

  it('builds the support mail link from the displayed address', () => {
    expect(SUPPORT_URL).toBe(
      `mailto:${SUPPORT_EMAIL}?subject=Ranked%20Choices%20support`,
    );
  });
});
