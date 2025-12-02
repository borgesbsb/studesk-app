import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('Studesk');
    await expect(page.locator('text=Faça login para continuar')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar');
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Email ou senha inválidos')).toBeVisible();
  });

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Using User 1 credentials from the test script
    await page.fill('input[type="email"]', 'user1@test.com');
    await page.fill('input[type="password"]', '123456');
    await page.click('button[type="submit"]');

    // Wait for URL to change to dashboard (client-side navigation)
    await page.waitForURL(/\/[A-Za-z0-9_-]{10}\/hoje/, { timeout: 15000 });

    // Verify we're on the authenticated page
    await expect(page.url()).toMatch(/\/[A-Za-z0-9_-]{10}\/hoje/);
  });

  test('should show register page', async ({ page }) => {
    await page.goto('/register');

    await expect(page.locator('h1')).toContainText('Studesk');
    await expect(page.locator('text=Crie sua conta')).toBeVisible();
    await expect(page.locator('input#name')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('input#confirmPassword')).toBeVisible();
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'newuser@test.com');
    await page.fill('input#password', '123456');
    await page.fill('input#confirmPassword', 'different');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=As senhas não coincidem')).toBeVisible();
  });

  test('should show error for short password', async ({ page }) => {
    await page.goto('/register');

    await page.fill('input#name', 'Test User');
    await page.fill('input#email', 'newuser@test.com');
    await page.fill('input#password', '123');
    await page.fill('input#confirmPassword', '123');
    await page.click('button[type="submit"]');

    // Wait a bit for the error message to appear
    await page.waitForTimeout(500);

    await expect(page.locator('text=A senha deve ter pelo menos 6 caracteres')).toBeVisible();
  });

  test('should navigate between login and register pages', async ({ page }) => {
    await page.goto('/login');

    await page.click('text=Criar conta');
    await expect(page).toHaveURL('/register');
    await expect(page.locator('text=Crie sua conta')).toBeVisible();

    await page.click('text=Fazer login');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('text=Faça login para continuar')).toBeVisible();
  });
});
