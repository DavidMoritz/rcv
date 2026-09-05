import type { ErrorEvent } from '@sentry/react-native';
import { describe, expect, it } from 'vitest';

import { sanitizeSentryEvent } from './sentry-sanitizer';

describe('sanitizeSentryEvent', () => {
  it('keeps symbolication fields while removing ballot, voter, route, and interaction data', () => {
    const event: ErrorEvent = {
      breadcrumbs: [{ message: 'Selected candidate Ada' }],
      contexts: {
        app: { app_version: '1.2.3', ballotName: 'Private board election' },
        device: { model: 'Pixel', name: 'Elisabeth phone' },
        navigation: { route: '/ballot/private-code' },
      },
      environment: 'production',
      event_id: 'event-id',
      exception: {
        values: [
          {
            mechanism: { handled: false, type: 'onerror', data: { voterCode: 'secret' } },
            stacktrace: {
              frames: [
                {
                  filename: 'src/app/index.tsx',
                  function: 'submitVote',
                  lineno: 42,
                  vars: { ranking: '[1,2,3]' },
                  context_line: 'throw new Error(ballot.name)',
                },
              ],
            },
            type: 'Error',
            value: 'Vote failed for private-code',
          },
        ],
      },
      extra: { voterEmail: 'voter@example.com' },
      message: 'Private board election failed',
      request: { url: 'https://rankedchoices.com/ballot/private-code' },
      tags: { shortcode: 'private-code' },
      type: undefined,
      user: { email: 'voter@example.com', id: '17' },
    };

    const sanitized = sanitizeSentryEvent(event);
    const serialized = JSON.stringify(sanitized);

    expect(sanitized).toMatchObject({
      contexts: { app: { app_version: '1.2.3' }, device: { model: 'Pixel' } },
      environment: 'production',
      event_id: 'event-id',
      exception: {
        values: [
          {
            mechanism: { handled: false, type: 'onerror' },
            stacktrace: {
              frames: [
                { filename: 'src/app/index.tsx', function: 'submitVote', lineno: 42 },
              ],
            },
            type: 'Error',
            value: 'Redacted application error',
          },
        ],
      },
    });
    expect(serialized).not.toMatch(
      /Private board election|private-code|secret|voter@example.com|Elisabeth|Selected candidate|\[1,2,3\]/,
    );
  });
});
