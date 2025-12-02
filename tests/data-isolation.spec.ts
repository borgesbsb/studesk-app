import { test, expect } from '@playwright/test';

test.describe('Data Isolation', () => {
  test('User 1 should only see their own data', async ({ page }) => {
    // Login as User 1
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user1@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for URL to change to dashboard
    await page.waitForURL(/\/[A-Za-z0-9_-]{10}\/hoje/, { timeout: 15000 });

    // Extract user hash from URL
    const url = page.url();
    const userHash = url.match(/\/([A-Za-z0-9_-]{10})\//)?.[1];
    expect(userHash).toBeTruthy();

    // Navigate to disciplines page
    await page.goto(`/${userHash}/disciplinas`);

    // Should see only User 1's discipline
    await expect(page.locator('text=Matemática User1')).toBeVisible();

    // Should NOT see User 2's discipline
    const portuguesText = page.locator('text=Português User2');
    await expect(portuguesText).not.toBeVisible();
  });

  test('User 2 should only see their own data', async ({ page }) => {
    // Login as User 2
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user2@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for URL to change to dashboard
    await page.waitForURL(/\/[A-Za-z0-9_-]{10}\/hoje/, { timeout: 15000 });

    // Extract user hash from URL
    const url = page.url();
    const userHash = url.match(/\/([A-Za-z0-9_-]{10})\//)?.[1];
    expect(userHash).toBeTruthy();

    // Navigate to disciplines page
    await page.goto(`/${userHash}/disciplinas`);

    // Should see only User 2's discipline
    await expect(page.locator('text=Português User2')).toBeVisible();

    // Should NOT see User 1's discipline
    const matematicaText = page.locator('text=Matemática User1');
    await expect(matematicaText).not.toBeVisible();
  });

  test('User 1 cannot access User 2 data via URL', async ({ page, context }) => {
    // Login as User 1
    await page.goto('/login');
    await page.fill('input[type="email"]', 'user1@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for URL to change to dashboard
    await page.waitForURL(/\/[A-Za-z0-9_-]{10}\/hoje/, { timeout: 15000 });
    const user1Url = page.url();
    const user1Hash = user1Url.match(/\/([A-Za-z0-9_-]{10})\//)?.[1];

    // Get User 2's hash by logging in in a new context
    const page2 = await context.newPage();
    await page2.goto('/login');
    await page2.fill('input[type="email"]', 'user2@test.com');
    await page2.fill('input[type="password"]', '123456');
    await page2.click('button[type="submit"]');
    await page2.waitForURL(/\/.*\/hoje/);

    const user2Url = page2.url();
    const user2Hash = user2Url.match(/\/([A-Za-z0-9_-]{10})\//)?.[1];

    await page2.close();

    // Try to access User 2's URL while logged in as User 1
    await page.goto(`/${user2Hash}/hoje`);

    // Should be redirected back to User 1's own dashboard
    await page.waitForURL(/\/.*\/hoje/);
    const redirectedUrl = page.url();
    expect(redirectedUrl).toContain(user1Hash);
    expect(redirectedUrl).not.toContain(user2Hash);
  });

  test('Unauthenticated user is redirected to login', async ({ page }) => {
    // Try to access authenticated route without logging in
    await page.goto('/anyHash123/hoje');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });
});
