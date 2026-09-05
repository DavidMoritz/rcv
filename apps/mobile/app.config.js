const variants = {
  development: {
    identifier: 'com.rankedchoices.dev',
    name: 'Ranked Choices (Dev)',
  },
  staging: {
    identifier: 'com.rankedchoices.app.staging',
    name: 'Ranked Choices (Staging)',
  },
  production: {
    identifier: 'com.rankedchoices.app',
    name: 'Ranked Choices',
  },
};

module.exports = ({ config }) => {
  const requestedVariant = process.env.APP_VARIANT || 'development';
  const variant = variants[requestedVariant] ? requestedVariant : 'development';
  const variantConfig = variants[variant];
  const sentryOrganization = process.env.SENTRY_ORG?.trim();
  const sentryProject = process.env.SENTRY_PROJECT?.trim();
  const plugins = [...(config.plugins || [])];

  if (sentryOrganization && sentryProject) {
    plugins.push([
      '@sentry/react-native/expo',
      {
        organization: sentryOrganization,
        project: sentryProject,
        url: process.env.SENTRY_URL?.trim() || 'https://sentry.io/',
      },
    ]);
  }

  return {
    ...config,
    name: variantConfig.name,
    extra: {
      ...config.extra,
      buildVariant: variant,
    },
    plugins,
    android: {
      ...config.android,
      package: process.env.RCV_ANDROID_PACKAGE || variantConfig.identifier,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: process.env.RCV_IOS_BUNDLE_IDENTIFIER || variantConfig.identifier,
    },
  };
};
