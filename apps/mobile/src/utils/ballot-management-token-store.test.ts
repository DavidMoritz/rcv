import { describe, expect, it, vi } from 'vitest';

import { ballotManagementTokenStorageKey, saveBallotManagementToken } from './ballot-management-token-store';

const token = 'a'.repeat(43);

describe('ballot management token storage', () => {
  it('stores the credential under a ballot-scoped, non-secret key', async () => {
    const storage = {
      isAvailableAsync: vi.fn(async () => true),
      setItemAsync: vi.fn(async () => undefined),
    };

    await saveBallotManagementToken(storage, '12ab34cd', token);

    expect(storage.setItemAsync).toHaveBeenCalledWith(
      'rankedchoices.ballot.12ab34cd.management-token',
      token,
    );
    expect(ballotManagementTokenStorageKey('12ab34cd')).not.toContain(token);
  });

  it('fails before writing when encrypted storage is unavailable', async () => {
    const storage = {
      isAvailableAsync: vi.fn(async () => false),
      setItemAsync: vi.fn(async () => undefined),
    };

    await expect(saveBallotManagementToken(storage, '12ab34cd', token)).rejects.toThrow(
      'Encrypted device storage is unavailable.',
    );
    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });

  it('rejects malformed keys and tokens', async () => {
    const storage = {
      isAvailableAsync: vi.fn(async () => true),
      setItemAsync: vi.fn(async () => undefined),
    };

    await expect(saveBallotManagementToken(storage, 'bad/key', token)).rejects.toThrow();
    await expect(saveBallotManagementToken(storage, '12ab34cd', 'not-a-token')).rejects.toThrow();
    expect(storage.setItemAsync).not.toHaveBeenCalled();
  });
});
