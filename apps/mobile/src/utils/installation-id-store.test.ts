import { describe, expect, it, vi } from 'vitest';

import { getOrCreateInstallationId, type StringStorage } from './installation-id-store';

describe('getOrCreateInstallationId', () => {
  it('reuses the persisted installation identifier', async () => {
    const storage: StringStorage = {
      getItem: vi.fn(async () => 'persisted-id'),
      setItem: vi.fn(async () => undefined),
    };
    const createId = vi.fn(() => 'new-id');

    await expect(getOrCreateInstallationId(storage, createId)).resolves.toBe('persisted-id');
    expect(createId).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('creates and persists an identifier once when missing', async () => {
    const storage: StringStorage = {
      getItem: vi.fn(async () => null),
      setItem: vi.fn(async () => undefined),
    };

    await expect(getOrCreateInstallationId(storage, () => 'new-id')).resolves.toBe('new-id');
    expect(storage.setItem).toHaveBeenCalledWith('@rankedchoices/installation-id', 'new-id');
  });
});
