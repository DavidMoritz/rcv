import { expect, test } from '@playwright/test';

test('creates a ballot, casts a vote, and renders results', async ({ page }) => {
  await page.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/).*/, (route) => {
    route.abort();
  });

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const shortcode = `e2e${suffix}`;
  const ballotName = `E2E Happy Path ${suffix}`;

  await page.goto('/create');
  await expect(page.getByTestId('create-view')).toBeVisible();

  await page.getByTestId('ballot-name-input').fill(ballotName);
  await page.getByTestId('ballot-key-input').fill(shortcode);
  await page.getByTestId('ballot-submit').click();

  const entryInput = page.getByTestId('entry-input');
  await expect(entryInput).toBeVisible();
  for (const entry of ['Ada', 'Grace', 'Katherine']) {
    await entryInput.fill(entry);
    await page.getByTestId('entry-add').click();
  }
  await expect(page.getByTestId('entry-list-item')).toHaveCount(3);

  await page.getByTestId('entries-submit').click();
  await expect(page.getByTestId('ballot-created')).toBeVisible();

  await page.getByTestId('vote-self-link').click();
  await expect(page.getByTestId('vote-ballot-title').filter({ visible: true })).toContainText(ballotName);
  const visibleCandidates = page.getByTestId('vote-candidate').filter({ visible: true });
  await expect(visibleCandidates).toHaveCount(3);
  const firstChoice = (await visibleCandidates.first().textContent()).trim();
  await page.getByTestId('vote-submit').click();

  await expect(page.getByTestId('vote-thanks').filter({ visible: true })).toBeVisible();
  await page.getByTestId('results-link').filter({ visible: true }).click();

  await expect(page.getByTestId('results-final').filter({ visible: true })).toBeVisible();
  await expect(page.getByTestId('results-winner-name').filter({ visible: true })).toHaveText(firstChoice);
});
