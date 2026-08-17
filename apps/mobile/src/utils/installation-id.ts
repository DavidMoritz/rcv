import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { getOrCreateInstallationId } from './installation-id-store';

export function loadInstallationId(): Promise<string> {
  return getOrCreateInstallationId(AsyncStorage, Crypto.randomUUID);
}
