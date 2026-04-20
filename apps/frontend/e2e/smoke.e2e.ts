import { test, expect } from '@playwright/test';

/**
 * Smoke tests — verify the application renders correctly.
 */

test.describe('Login Page', () => {
  test('login page renders with GETIDFIX logo', async ({ page }) => {
    await page.goto('/login');

    // Page should load without errors
    const title = await page.title();
    expect(title).toContain('GETIDFIX');

    // Logo should be visible — check for the SVG shield
    const logo = page.locator('svg').first();
    await expect(logo).toBeVisible();

    // Logo wordmark should contain GETIDFIX text
    const logoText = page.getByText(/GETIDFIX/i).first();
    await expect(logoText).toBeVisible();
  });

  test('login page has Sign In tab', async ({ page }) => {
    await page.goto('/login');

    // Sign In tab should be visible
    const signInTab = page.getByRole('button', { name: /sign in/i });
    await expect(signInTab).toBeVisible();
  });

  test('login page has Create Account tab', async ({ page }) => {
    await page.goto('/login');

    // Create Account tab should be visible
    const createAccountTab = page.getByRole('button', { name: /create account/i });
    await expect(createAccountTab).toBeVisible();
  });

  test('Sign In tab shows email and password fields', async ({ page }) => {
    await page.goto('/login');

    // Click Sign In tab (it should be active by default)
    const signInTab = page.getByRole('button', { name: /sign in/i });
    await signInTab.click();

    // Email and password fields should be visible
    const emailInput = page.locator('input[type="email"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('Create Account tab shows registration form', async ({ page }) => {
    await page.goto('/login');

    // Click Create Account tab
    const createAccountTab = page.getByRole('button', { name: /create account/i });
    await createAccountTab.click();

    // Registration form fields should be visible
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
  });

  test('forgot password link is visible on login form', async ({ page }) => {
    await page.goto('/login');

    const forgotLink = page.getByText(/forgot password/i);
    await expect(forgotLink).toBeVisible();
  });

  test('page renders correctly at mobile width (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');

    // No horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance

    // Logo should still be visible
    const logo = page.locator('svg').first();
    await expect(logo).toBeVisible();
  });

  test('page renders correctly at desktop width (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/login');

    const logo = page.locator('svg').first();
    await expect(logo).toBeVisible();
  });
});

test.describe('Forgot Password Page', () => {
  test('forgot password page renders correctly', async ({ page }) => {
    await page.goto('/forgot-password');

    const title = await page.title();
    expect(title).toContain('GETIDFIX');

    // Email input should be visible
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();

    // Submit button should be visible
    const submitBtn = page.getByRole('button', { name: /send reset link/i });
    await expect(submitBtn).toBeVisible();
  });
});
