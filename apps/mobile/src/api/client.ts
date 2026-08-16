import { getApiBaseUrl } from '@/config/api';

import { LegacyApiClient } from './legacy-api';
import { V2ApiClient } from './v2-api';

export function createLegacyApiClient(): LegacyApiClient {
  return new LegacyApiClient({ baseUrl: getApiBaseUrl() });
}

export function createV2ApiClient(): V2ApiClient {
  return new V2ApiClient({ baseUrl: getApiBaseUrl() });
}
