export type SecureStringStorage = {
  isAvailableAsync(): Promise<boolean>;
  setItemAsync(key: string, value: string): Promise<void>;
};

const MANAGEMENT_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const BALLOT_KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

export function ballotManagementTokenStorageKey(ballotKey: string): string {
  if (!BALLOT_KEY_PATTERN.test(ballotKey)) {
    throw new Error('Cannot store a credential for an invalid ballot key.');
  }
  return `rankedchoices.ballot.${ballotKey}.management-token`;
}

export async function saveBallotManagementToken(
  storage: SecureStringStorage,
  ballotKey: string,
  managementToken: string,
): Promise<void> {
  if (!MANAGEMENT_TOKEN_PATTERN.test(managementToken)) {
    throw new Error('Cannot store an invalid ballot management credential.');
  }
  if (!(await storage.isAvailableAsync())) {
    throw new Error('Encrypted device storage is unavailable.');
  }
  await storage.setItemAsync(ballotManagementTokenStorageKey(ballotKey), managementToken);
}
