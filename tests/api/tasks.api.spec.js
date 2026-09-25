const { test, expect } = require('@playwright/test');
const { startServer, stopServer } = require('../helpers/server');
const { backupTasksFile, restoreTasksFile, readTasksFile, writeTasksFile, deleteTasksFile } = require('../helpers/fs');

test.describe('Task Manager API - EPMEDUAI-2393 (Persistence) & EPMEDUAI-2395 (Validation)', () => {

  test.beforeAll(() => {
    backupTasksFile();
  });

  test.afterAll(() => {
    restoreTasksFile();
  });

  test.beforeEach(async () => {
    await stopServer();
    deleteTasksFile();
  });

  test.afterEach(async () => {
    await stopServer();
  });

  test('should load persisted tasks on server startup', async ({ request }) => {
    // Given: tasks JSON file contains tasks
    const persistedTasks = [
      { id: 1, title: 'Persisted Task 1', completed: false },
      { id: 2, title: 'Persisted Task 2', completed: true }
    ];
    writeTasksFile(persistedTasks);

    // When: server starts
    await startServer();

    // Then: GET /api/tasks returns the persisted tasks
    const response = await request.get('/api/tasks');
    expect(response.ok()).toBeTruthy();

    const tasks = await response.json();
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toMatchObject({ id: 1, title: 'Persisted Task 1', completed: false });
    expect(tasks[1]).toMatchObject({ id: 2, title: 'Persisted Task 2', completed: true });
  });

  test('should persist task on create', async ({ request }) => {
    // Given: server is running with empty state
    deleteTasksFile();
    await startServer();

    // When: POST a new task
    const response = await request.post('/api/tasks', {
      data: { title: 'New Task' }
    });

    // Then: task is returned with 201
    expect(response.status()).toBe(201);
    const createdTask = await response.json();
    expect(createdTask).toMatchObject({
      title: 'New Task',
      completed: false
    });
    expect(createdTask.id).toBeDefined();

    // And: GET /api/tasks includes the new task
    const getResponse = await request.get('/api/tasks');
    const tasks = await getResponse.json();
    expect(tasks).toContainEqual(createdTask);

    // And: tasks JSON file includes the new task
    const fileContents = readTasksFile();
    expect(fileContents).toContainEqual(createdTask);
  });

  test('should persist task on complete', async ({ request }) => {
    // Given: an existing active task
    const initialTasks = [
      { id: 1, title: 'Task to Complete', completed: false }
    ];
    writeTasksFile(initialTasks);
    await startServer();

    // When: PATCH /api/tasks/1/complete
    const response = await request.patch('/api/tasks/1/complete');

    // Then: task is marked completed in response
    expect(response.ok()).toBeTruthy();
    const completedTask = await response.json();
    expect(completedTask).toMatchObject({
      id: 1,
      title: 'Task to Complete',
      completed: true
    });

    // And: tasks JSON file shows completed true
    const fileContents = readTasksFile();
    const taskInFile = fileContents.find(t => t.id === 1);
    expect(taskInFile.completed).toBe(true);
  });

  test.skip('should persist task on delete - DEFERRED to EPMEDUAI-2394', async ({ request }) => {
    // This scenario is skipped because DELETE endpoint is not implemented in current phase
    // Tracked as dependency: EPMEDUAI-2394 (Delete Task functionality)
    // Once DELETE /api/tasks/:id is implemented, this test can be enabled

    // Expected behavior when implemented:
    // Given: an existing task
    // When: DELETE /api/tasks/:id
    // Then: task is removed from memory and tasks JSON file
  });

  test('should reject missing title with 400', async ({ request }) => {
    await startServer();

    const response = await request.post('/api/tasks', {
      data: {}
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toBeDefined();
    expect(error.message.toLowerCase()).toContain('title');
  });

  test('should reject empty title after trimming with 400', async ({ request }) => {
    await startServer();

    const response = await request.post('/api/tasks', {
      data: { title: '   ' }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toBeDefined();
  });

  test('should reject title exceeding 100 characters with 400', async ({ request }) => {
    await startServer();

    const longTitle = 'a'.repeat(101);
    const response = await request.post('/api/tasks', {
      data: { title: longTitle }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toBeDefined();
    expect(error.message.toLowerCase()).toContain('100');
  });

  test('should accept valid task with title at max length (100 chars)', async ({ request }) => {
    await startServer();

    const maxLengthTitle = 'a'.repeat(100);
    const response = await request.post('/api/tasks', {
      data: { title: maxLengthTitle }
    });

    expect(response.status()).toBe(201);
    const task = await response.json();
    expect(task.title).toBe(maxLengthTitle);
  });

  test('should trim whitespace from valid title', async ({ request }) => {
    await startServer();

    const response = await request.post('/api/tasks', {
      data: { title: '  Valid Task  ' }
    });

    expect(response.status()).toBe(201);
    const task = await response.json();
    expect(task.title).toBe('Valid Task');
  });
});
