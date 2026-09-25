const fsp = require('fs/promises');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const tasksFile = path.join(rootDir, 'data', 'tasks.json');

async function ensureDir() {
  await fsp.mkdir(path.dirname(tasksFile), { recursive: true });
}

async function readTasksFile() {
  try {
    const txt = await fsp.readFile(tasksFile, 'utf8');
    return JSON.parse(txt);
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
}

async function writeTasksFile(tasks) {
  await ensureDir();
  await fsp.writeFile(tasksFile, JSON.stringify(tasks, null, 2), 'utf8');
}

let backup = undefined;

async function backupTasksFile() {
  backup = await readTasksFile();
}

async function restoreTasksFile() {
  if (backup === undefined) return;

  if (backup === null) {
    try {
      await fsp.unlink(tasksFile);
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
    return;
  }

  await writeTasksFile(backup);
}

module.exports = {
  rootDir,
  tasksFile,
  readTasksFile,
  writeTasksFile,
  backupTasksFile,
  restoreTasksFile
};
