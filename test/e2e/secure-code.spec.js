import { expect, test } from '@playwright/test';

test('creates a secure ballot, validates a voter code, and renders results', async ({ page }) => {
  await page.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/).*/, (route) => {
    route.abort();
  });

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const username = `secureuser${suffix}`;
  const password = `pass-${suffix}`;
  const shortcode = `sec${suffix}`.slice(0, 16);
  const ballotName = `Secure E2E ${suffix}`;

  await page.goto('/register');
  const registerView = page.getByTestId('register-view');
  await expect(registerView).toBeVisible();
  const addUserResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/add-user.php') && response.request().method() === 'POST'
  );
  await registerView.getByTestId('register-username-input').fill(username);
  await registerView.getByTestId('register-password-input').fill(password);
  await registerView.getByTestId('register-submit').click();
  const addUserResponse = await addUserResponsePromise;
  const user = await addUserResponse.json();
  const userId = user.id;

  const createView = page.getByTestId('create-view');
  await expect(createView).toBeVisible();
  await createView.getByTestId('ballot-name-input').fill(ballotName);
  await createView.getByTestId('ballot-key-input').fill(shortcode);
  await createView.getByTestId('advanced-options-toggle').check();
  await createView.getByText('Voter Settings').click();
  await createView.getByTestId('secure-ballot-toggle').check();
  await createView.getByTestId('secure-code-count-input').fill('1');

  const newBallotResponsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/new-ballot.php') && response.request().method() === 'POST'
  );
  await createView.getByTestId('ballot-submit').click();
  const newBallotResponse = await newBallotResponsePromise;
  const ballotId = Number(await newBallotResponse.text());
  expect(ballotId).toBeGreaterThan(0);

  const entryInput = createView.getByTestId('entry-input');
  await expect(entryInput).toBeVisible();
  for (const entry of ['Ada', 'Grace', 'Katherine']) {
    await entryInput.fill(entry);
    await createView.getByTestId('entry-add').click();
  }
  await createView.getByTestId('entries-submit').click();
  await expect(createView.getByTestId('ballot-created')).toBeVisible();

  const codesResponse = await page.request.post('/api/get-ballot-codes.php', {
    data: {
      ballotId,
      createdBy: userId
    }
  });
  expect(codesResponse.ok()).toBeTruthy();
  const codesPayload = await codesResponse.json();
  expect(codesPayload.codes).toHaveLength(1);
  const voterCode = codesPayload.codes[0].code;

  await page.goto(`/vote#${shortcode}`);
  const voteView = page.getByTestId('vote-view');
  const secureGate = voteView.getByTestId('secure-code-gate');
  await expect(secureGate.getByTestId('vote-ballot-title')).toContainText(ballotName);

  await secureGate.getByTestId('secure-code-input').fill('xxxxxx');
  await secureGate.getByTestId('secure-code-submit').click();
  await expect(secureGate.getByTestId('secure-code-error')).toHaveText('This code is not valid');

  await secureGate.getByTestId('secure-code-input').fill(voterCode);
  await secureGate.getByTestId('secure-code-submit').click();

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
