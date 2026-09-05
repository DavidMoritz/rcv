import { devices, expect, test } from '@playwright/test';

test.use({
  ...devices['iPhone 13']
});

test('supports a mobile voting sanity flow without drag and drop', async ({ page }) => {
  await page.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/).*/, (route) => {
    route.abort();
  });

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const shortcode = `mobe2e${suffix}`;
  const ballotName = `Mobile E2E ${suffix}`;

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

  const voteLink = await createView.getByTestId('vote-self-link').getAttribute('href');
  const ballotKey = new URL(voteLink).pathname.split('/').pop();

  await createView.getByTestId('vote-self-link').click();

  const voteView = page.getByTestId('vote-view');
  await expect(voteView).toBeVisible();

  let ballotForm = voteView.getByTestId('vote-ballot-form');
  const formLoadedDirectly = await ballotForm
    .waitFor({ state: 'visible', timeout: 5_000 })
    .then(() => true)
    .catch(() => false);

  if (!formLoadedDirectly) {
    await voteView.locator('input[name="ballot"]').fill(ballotKey);
    await voteView.getByRole('button', { name: 'Submit' }).click();
    ballotForm = voteView.getByTestId('vote-ballot-form');
  }

  await expect(voteView.getByTestId('vote-ballot-title').first()).toContainText(ballotName);
  await expect(ballotForm).toBeVisible();

  const candidates = ballotForm.getByTestId('vote-candidate');
  await expect(candidates).toHaveCount(3);

  const initialNames = await candidates.getByTestId('vote-candidate-name').allInnerTexts();
  await candidates.first().getByTestId('vote-candidate-remove').click();
  await expect(candidates).toHaveCount(2);
  const namesAfterRemoval = await candidates.getByTestId('vote-candidate-name').allInnerTexts();
  expect(namesAfterRemoval).not.toContain(initialNames[0]);

  await ballotForm.getByTestId('vote-reset').click();
  await expect(candidates).toHaveCount(3);

  const resetNames = await candidates.getByTestId('vote-candidate-name').allInnerTexts();
  expect([...resetNames].sort()).toEqual([...initialNames].sort());

  const firstChoice = resetNames[0];
  await ballotForm.getByTestId('vote-submit').click();

  await expect(voteView.getByTestId('vote-thanks')).toBeVisible();
  await voteView.getByTestId('results-link').click();

  const resultsView = page.getByTestId('results-view');
  const finalResults = resultsView.getByTestId('results-final');
  await expect(finalResults).toBeVisible();
  await expect(finalResults.getByTestId('results-winner-name')).toHaveText(firstChoice);
});
