'use strict';

const path = require('path');
const fs = require('fs/promises');

const DATA_DIR = path.join(__dirname, '..', 'data');
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const TMP_FILE = path.join(DATA_DIR, 'tasks.json.tmp');

/**
 * Serialized write queue to prevent concurrent writes from interleaving.
 * Each save waits for the previous save to finish.
 */
let writeQueue = Promise.resolve();

function defaultSampleTasks() {
  return [
    { id: 1, title: 'Complete AI Course', completed: false },
    { id: 2, title: 'Review automation scripts', completed: false },
  ];
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Atomic write: write to temp file then rename over the target file.
 * On most platforms, rename is atomic on the same filesystem.
 */
async function atomicWriteJson(filePath, tmpPath, data) {
  const json = JSON.stringify(data, null, 2);

  await ensureDataDir();
  await fs.writeFile(tmpPath, json, 'utf8');
  await fs.rename(tmpPath, filePath);
}

/**
 * Loads tasks from disk. If tasks file does not exist, seeds with two sample tasks
 * and immediately persists them to disk. Once the file exists, it is the source of truth.
 */
async function loadTasks() {
  await ensureDataDir();

  const exists = await fileExists(TASKS_FILE);
  if (!exists) {
    const seeded = defaultSampleTasks();
    // Immediately persist the seeded data as required.
    await atomicWriteJson(TASKS_FILE, TMP_FILE, seeded);
    return seeded;
  }

  // Source of truth: the existing JSON file.
  const raw = await fs.readFile(TASKS_FILE, 'utf8');
  const parsed = JSON.parse(raw);

  // Defensive: ensure we always return an array.
  return Array.isArray(parsed) ? parsed : [];
}

/**
 * Persists tasks to disk, serialized via writeQueue, using atomic write.
 */
async function saveTasks(tasks) {
  // Detached deep snapshot to prevent caller mutation
  const snapshot = Array.isArray(tasks) ? tasks.map(task => ({ ...task })) : [];

  writeQueue = writeQueue.then(() => atomicWriteJson(TASKS_FILE, TMP_FILE, snapshot));
  return writeQueue;
}

module.exports = {
  loadTasks,
  saveTasks,
  TASKS_FILE,
};
