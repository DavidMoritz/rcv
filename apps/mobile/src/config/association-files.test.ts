import { describe, expect, it } from 'vitest';

import androidAssociation from '../../../../docs/mobile-association-files/assetlinks.template.json';
import appleAssociation from '../../../../docs/mobile-association-files/apple-app-site-association.template.json';

describe('mobile association templates', () => {
  it('limits the Apple association to production ballot links', () => {
    expect(appleAssociation).toEqual({
      applinks: {
        details: [
          {
            appIDs: ['APPLE_TEAM_ID.com.rankedchoices.app'],
            components: [
              {
                '/': '/ballot/*',
                comment: 'Open public Ranked Choices ballot links in the production app.',
              },
            ],
          },
        ],
      },
    });
  });

  it('uses the Play app-signing placeholder for the production package', () => {
    expect(androidAssociation).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.rankedchoices.app',
          sha256_cert_fingerprints: ['ANDROID_RELEASE_SHA256_FINGERPRINT'],
        },
      },
    ]);
  });
});
