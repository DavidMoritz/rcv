import { expect, test } from '@playwright/test';

test('registers, signs out, rejects a bad password, and logs back in', async ({ page }) => {
  await page.route(/^https?:\/\/(?!(127\.0\.0\.1|localhost)(:\d+)?\/).*/, (route) => {
    route.abort();
  });

  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const username = `e2euser${suffix}`;
  const password = `pass-${suffix}`;

  await page.goto('/register');
  const registerView = page.getByTestId('register-view');
  await expect(registerView).toBeVisible();

  await registerView.getByTestId('register-username-input').fill(username);
  await registerView.getByTestId('register-password-input').fill(password);
  await registerView.getByTestId('register-submit').click();

  const createView = page.getByTestId('create-view');
  await expect(createView).toBeVisible();
  await expect(createView).toContainText(`Created By ${username}`);

  await page.getByRole('link', { name: /profile/i }).click();
  const profileView = page.getByTestId('profile-view');
  await expect(profileView).toBeVisible();
  await expect(profileView.getByTestId('profile-name')).toHaveText(`Name: ${username}`);

  await profileView.getByTestId('sign-out').click();
  await expect(page.getByRole('link', { name: /^register/i })).toBeVisible();

  await page.goto('/register');
  await registerView.getByTestId('login-username-input').fill(username);
  await registerView.getByTestId('login-password-input').fill(`${password}-wrong`);
  await registerView.getByTestId('login-submit').click();
  await expect(registerView.getByTestId('login-error')).toBeVisible();

  await registerView.getByTestId('login-password-input').fill(password);
  await registerView.getByTestId('login-remember-input').check();
  await registerView.getByTestId('login-submit').click();

  await expect(profileView).toBeVisible();
  await expect(profileView.getByTestId('profile-name')).toHaveText(`Name: ${username}`);

  await page.reload();
  await expect(registerView.getByTestId('signed-in-message')).toHaveText(
    `Thank you for signing in as ${username}.`
  );
  await page.getByRole('link', { name: /profile/i }).click();
  await expect(profileView).toBeVisible();
  await expect(profileView.getByTestId('profile-name')).toHaveText(`Name: ${username}`);
});
