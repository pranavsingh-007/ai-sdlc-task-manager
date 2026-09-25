const fs = require('fs');
const path = require('path');

const TASKS_FILE = path.join(process.cwd(), 'data', 'tasks.json');
const TASKS_TEMP_FILE = path.join(process.cwd(), 'data', 'tasks.json.tmp');
const BACKUP_FILE = path.join(process.cwd(), 'data', 'tasks.json.backup');

function ensureDataDir() {
  const dataDir = path.dirname(TASKS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

function backupTasksFile() {
  ensureDataDir();
  if (fs.existsSync(TASKS_FILE)) {
    fs.copyFileSync(TASKS_FILE, BACKUP_FILE);
  }
}

function restoreTasksFile() {
  ensureDataDir();

  // Clean up temp file if present
  if (fs.existsSync(TASKS_TEMP_FILE)) {
    fs.unlinkSync(TASKS_TEMP_FILE);
  }

  if (fs.existsSync(BACKUP_FILE)) {
    fs.copyFileSync(BACKUP_FILE, TASKS_FILE);
    fs.unlinkSync(BACKUP_FILE);
  } else if (fs.existsSync(TASKS_FILE)) {
    fs.unlinkSync(TASKS_FILE);
  }
}

function readTasksFile() {
  if (!fs.existsSync(TASKS_FILE)) {
    return null;
  }
  const content = fs.readFileSync(TASKS_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeTasksFile(tasks) {
  ensureDataDir();
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

function deleteTasksFile() {
  if (fs.existsSync(TASKS_FILE)) {
    fs.unlinkSync(TASKS_FILE);
  }
  // Also remove temp file to ensure clean state
  if (fs.existsSync(TASKS_TEMP_FILE)) {
    fs.unlinkSync(TASKS_TEMP_FILE);
  }
}

module.exports = {
  TASKS_FILE,
  backupTasksFile,
  restoreTasksFile,
  readTasksFile,
  writeTasksFile,
  deleteTasksFile
};
