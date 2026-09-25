const { test, expect } = require('@playwright/test');
const { startServer, stopServer } = require('../helpers/server');
const { backupTasksFile, restoreTasksFile, deleteTasksFile } = require('../helpers/fs');

test.describe('Task Manager UI - EPMEDUAI-2395 (Error Handling)', () => {

  test.beforeAll(() => {
    backupTasksFile();
  });

  test.afterAll(() => {
    restoreTasksFile();
  });

  test.beforeEach(async () => {
    await stopServer();
    deleteTasksFile();
    await startServer();
  });

  test.afterEach(async () => {
    await stopServer();
  });

  test('should show friendly error when submitting blank title', async ({ page }) => {
    await page.goto('/');

    // Wait for page to load
    await page.waitForSelector('#taskInput');

    // Get initial task count
    const initialTasks = await page.locator('#taskList li').count();

    // Try to submit with empty input
    await page.click('button:has-text("Add Task")');

    // Then: error message is displayed
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toHaveText('Please enter a task title.');

    // And: no new task appears in the list
    const finalTasks = await page.locator('#taskList li').count();
    expect(finalTasks).toBe(initialTasks);
  });

  test('should show friendly error when submitting whitespace-only title', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    const initialTasks = await page.locator('#taskList li').count();

    // Enter whitespace only
    await page.fill('#taskInput', '   ');
    await page.click('button:has-text("Add Task")');

    // Then: error message is displayed
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toHaveText('Please enter a task title.');

    // And: no new task appears in the list
    const finalTasks = await page.locator('#taskList li').count();
    expect(finalTasks).toBe(initialTasks);
  });

  test('should show backend validation error for title over 100 chars', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    // Enter title exceeding 100 characters
    const longTitle = 'a'.repeat(101);
    await page.fill('#taskInput', longTitle);
    await page.click('button:has-text("Add Task")');

    // Then: error message from backend is displayed
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
    const errorText = await errorBox.textContent();
    expect(errorText.toLowerCase()).toContain('100');
  });

  test('should show friendly error on server error (non-JSON 500)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    // Intercept POST request and return non-JSON 500 error
    await page.route('/api/tasks', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'text/plain',
          body: 'Internal Server Error'
        });
      } else {
        route.continue();
      }
    });

    // Try to add a task
    await page.fill('#taskInput', 'Test Task');
    await page.click('button:has-text("Add Task")');

    // Then: friendly fallback error message is displayed
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toHaveText('Failed to add task. Please try again.');

    // And: UI remains usable - input is still available
    await expect(page.locator('#taskInput')).toBeVisible();
    await expect(page.locator('button:has-text("Add Task")')).toBeEnabled();
  });

  test('should show friendly error on network failure', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    // Simulate network failure
    await page.route('/api/tasks', (route) => {
      if (route.request().method() === 'POST') {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Try to add a task
    await page.fill('#taskInput', 'Test Task');
    await page.click('button:has-text("Add Task")');

    // Then: friendly error message is displayed
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();
    await expect(errorBox).toHaveText('Failed to add task. Please check your connection.');
  });

  test('should successfully add valid task (happy path regression)', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    // Get initial task count
    const initialTasks = await page.locator('#taskList li').count();

    // Add a valid task
    await page.fill('#taskInput', 'Valid Test Task');
    await page.click('button:has-text("Add Task")');

    // Wait for the task to appear first (async operation completes)
    await expect(page.locator('#taskList li')).toHaveCount(initialTasks + 1);
    await expect(page.locator('#taskList')).toContainText('Valid Test Task');

    // Then: no error is shown
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toHaveClass(/hidden/);

    // And: input is cleared
    await expect(page.locator('#taskInput')).toHaveValue('');
  });

  test('should clear error when valid task is submitted after error', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#taskInput');

    // First, trigger an error
    await page.click('button:has-text("Add Task")');
    const errorBox = page.locator('#errorBox');
    await expect(errorBox).toBeVisible();

    // Then, submit a valid task
    await page.fill('#taskInput', 'Valid Task After Error');
    await page.click('button:has-text("Add Task")');

    // Error should be cleared
    await expect(errorBox).toHaveClass(/hidden/);
    await expect(page.locator('#taskList')).toContainText('Valid Task After Error');
  });
});
