/*eslint-env node */
const { test, expect } = require('@playwright/test');
const { startServer, stopServer, BASE_URL } = require('../helpers/server');
const { backupTasksFile, restoreTasksFile, writeTasksFile } = require('../helpers/fs');

test.describe('UI - Mini Task Manager (EP1 - EPMEDUAI-2395)', () => {
  test.beforeAll(async () => {
    await backupTasksFile();
  });

  test.afterAll(async () => {
    await stopServer();
    await restoreTasksFile();
  });

  test.beforeEach(async () => {
    await writeTasksFile([]);
    await startServer();
  });

  test('client-side validation: blank title shows friendly error', async ({ page }) => {
    await page.goto('/');

    await page.fill('#taskInput', '   ');
    await page.getByRole('button', { name: /add task/i }).click();

    await expect(page.locator('#errorBox')).toBeVisible();
    await expect(page.locator('#errorBox')).toHaveText('Please enter a task title.');
    await expect(page.locator('#taskList >li')).toHaveCount(0);
  });

  test('server-validation error (PASSED from backend): shows message', async ({ page }) => {
    await page.route('**/api/tasks', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Title cannot be empty' })
        });
      }
      return route.continue();
    });

    await page.goto('/');
    await page.fill('#taskInput', 'valid text');
    await page.getByRole('button', { name: /add task/i }).click();

    await expect(page.locator('#errorBox')).toBeVisible();
    await expect(page.locator('#errorBox')).toHaveText('Title cannot be empty');
  });

  test('server 500 error: shows fallback friendly message', sync ({ page }) => {
    await page.route('**/api/tasks', route => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 500,
          contentType: 'text/plain',
          body: 'Server error'
        });
      }
      return route.continue();
    });

    await page.goto('/');
    await page.fill('#taskInput', 'This fails server-side');
    await page.getByRole('button', { name: /add task/i }).click();

    await expect(page.locator('#errorBox')).toBeVisible();
    await expect(page.locator('#errorBox')).toHaveText('Failed to add task. Please try again.');
  });
});
