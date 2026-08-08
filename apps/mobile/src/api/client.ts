import { getApiBaseUrl } from '@/config/api';

import { LegacyApiClient } from './legacy-api';

export function createLegacyApiClient(): LegacyApiClient {
  return new LegacyApiClient({ baseUrl: getApiBaseUrl() });
}
