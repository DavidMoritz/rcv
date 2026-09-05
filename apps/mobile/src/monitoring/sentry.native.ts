import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { sanitizeSentryEvent } from './sentry-sanitizer';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
const enabled = process.env.EXPO_PUBLIC_SENTRY_ENABLED === 'true' && Boolean(dsn);

if (enabled) {
  Sentry.init({
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: () => null,
    beforeSend: sanitizeSentryEvent,
    dsn,
    enableAutoPerformanceTracing: false,
    enableAutoSessionTracking: false,
    enableCaptureFailedRequests: false,
    enableLogs: false,
    enableUserInteractionTracing: false,
    environment: String(Constants.expoConfig?.extra?.buildVariant || 'development'),
    maxBreadcrumbs: 0,
    replaysOnErrorSampleRate: 0,
    replaysSessionSampleRate: 0,
    sendDefaultPii: false,
  });
}

export const sentryEnabled = enabled;
