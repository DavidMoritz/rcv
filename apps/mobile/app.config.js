module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    ...(process.env.RCV_ANDROID_PACKAGE ? { package: process.env.RCV_ANDROID_PACKAGE } : {}),
  },
  ios: {
    ...config.ios,
    ...(process.env.RCV_IOS_BUNDLE_IDENTIFIER
      ? { bundleIdentifier: process.env.RCV_IOS_BUNDLE_IDENTIFIER }
      : {}),
  },
});
