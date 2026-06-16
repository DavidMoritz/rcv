import { expect, test } from '@playwright/test';

test('creates a ballot, casts a vote, and renders results', async ({ page }) => {
  await page.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/).*/, (route) => {
    route.abort();
  });

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const shortcode = `e2e${suffix}`;
  const ballotName = `E2E Happy Path ${suffix}`;

  await page.goto('/create');
  const createView = page.getByTestId('create-view');
  await expect(createView).toBeVisible();

  await createView.getByTestId('ballot-name-input').fill(ballotName);
  await createView.getByTestId('ballot-key-input').fill(shortcode);
  await createView.getByTestId('ballot-submit').click();

  const entryInput = createView.getByTestId('entry-input');
  await expect(entryInput).toBeVisible();
  for (const entry of ['Ada', 'Grace', 'Katherine']) {
    await entryInput.fill(entry);
    await createView.getByTestId('entry-add').click();
  }
  await expect(createView.getByTestId('entry-list-item')).toHaveCount(3);

  await createView.getByTestId('entries-submit').click();
  await expect(createView.getByTestId('ballot-created')).toBeVisible();

  await createView.getByTestId('vote-self-link').click();
  const voteView = page.getByTestId('vote-view');
  const ballotForm = voteView.getByTestId('vote-ballot-form');
  await expect(ballotForm.getByTestId('vote-ballot-title')).toContainText(ballotName);
  const candidates = ballotForm.getByTestId('vote-candidate');
  await expect(candidates).toHaveCount(3);
  const firstChoice = await candidates.first().getByTestId('vote-candidate-name').innerText();
  await ballotForm.getByTestId('vote-submit').click();

  await expect(voteView.getByTestId('vote-thanks')).toBeVisible();
  await voteView.getByTestId('results-link').click();

  const resultsView = page.getByTestId('results-view');
  const finalResults = resultsView.getByTestId('results-final');
  await expect(finalResults).toBeVisible();
  await expect(finalResults.getByTestId('results-winner-name')).toHaveText(firstChoice);
});
