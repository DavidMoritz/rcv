import { afterEach, describe, expect, it } from 'vitest';

type ExpoConfigInput = {
  config: {
    android?: Record<string, unknown>;
    extra?: Record<string, unknown>;
    ios?: Record<string, unknown>;
    plugins?: unknown[];
  };
};

type ExpoConfigResult = {
  android: { package: string };
  extra: { buildVariant: string };
  ios: { bundleIdentifier: string };
  name: string;
  plugins: unknown[];
};

// app.config.js must remain CommonJS because Expo loads it directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const appConfig = require('../../app.config.js') as (input: ExpoConfigInput) => ExpoConfigResult;

const environmentKeys = [
  'APP_VARIANT',
  'RCV_ANDROID_PACKAGE',
  'RCV_IOS_BUNDLE_IDENTIFIER',
  'SENTRY_ORG',
  'SENTRY_PROJECT',
  'SENTRY_URL',
] as const;

afterEach(() => {
  for (const key of environmentKeys) {
    delete process.env[key];
  }
});

function resolveConfig() {
  return appConfig({ config: { plugins: ['expo-router'] } });
}

describe('mobile app build variants', () => {
  it.each([
    ['development', 'Ranked Choices (Dev)', 'com.rankedchoices.dev'],
    ['staging', 'Ranked Choices (Staging)', 'com.rankedchoices.app.staging'],
    ['production', 'Ranked Choices', 'com.rankedchoices.app'],
  ])('maps %s to a distinct app identity', (variant, name, identifier) => {
    process.env.APP_VARIANT = variant;

    const config = resolveConfig();

    expect(config.name).toBe(name);
    expect(config.extra.buildVariant).toBe(variant);
    expect(config.android.package).toBe(identifier);
    expect(config.ios.bundleIdentifier).toBe(identifier);
  });

  it('uses the development identity for an unset or invalid variant', () => {
    expect(resolveConfig().android.package).toBe('com.rankedchoices.dev');

    process.env.APP_VARIANT = 'unexpected';
    expect(resolveConfig().extra.buildVariant).toBe('development');
  });

  it('preserves explicit platform identifier overrides', () => {
    process.env.APP_VARIANT = 'production';
    process.env.RCV_ANDROID_PACKAGE = 'example.android';
    process.env.RCV_IOS_BUNDLE_IDENTIFIER = 'example.ios';

    const config = resolveConfig();

    expect(config.android.package).toBe('example.android');
    expect(config.ios.bundleIdentifier).toBe('example.ios');
  });

  it('adds the Sentry build plugin only with both project coordinates', () => {
    process.env.SENTRY_ORG = 'ranked-choices';
    expect(resolveConfig().plugins).toEqual(['expo-router']);

    process.env.SENTRY_PROJECT = 'mobile';
    expect(resolveConfig().plugins).toEqual([
      'expo-router',
      [
        '@sentry/react-native/expo',
        {
          organization: 'ranked-choices',
          project: 'mobile',
          url: 'https://sentry.io/',
        },
      ],
    ]);
  });
});
