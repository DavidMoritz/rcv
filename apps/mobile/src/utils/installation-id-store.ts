export type StringStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

export async function getOrCreateInstallationId(
  storage: StringStorage,
  createId: () => string,
  storageKey = '@rankedchoices/installation-id',
): Promise<string> {
  const existing = await storage.getItem(storageKey);
  if (existing) return existing;

  const created = createId();
  await storage.setItem(storageKey, created);
  return created;
}
