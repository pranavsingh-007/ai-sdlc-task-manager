const express = require("express");
const path = require("path");
const { loadTasks, saveTasks } = require("./persistence/taskStore");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let tasks = [];

app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/api/tasks", async (req, res) => {
  const title = req.body?.title;

  // Validate: missing title
  if (title === undefined || title === null) {
    return res.status(400).json({ message: "Title is required" });
  }

  const trimmed = title.trim();

  // Validate: trimmed empty title
  if (trimmed.length === 0) {
    return res.status(400).json({ message: "Title cannot be empty" });
  }

  // Validate: title length > 100
  if (trimmed.length > 100) {
    return res.status(400).json({ message: "Title must be at most 100 characters" });
  }

  const task = {
    id: Date.now(),
    title: trimmed,
    completed: false
  };

  tasks.push(task);
  await saveTasks(tasks);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id/complete", async (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.completed = true;
  await saveTasks(tasks);
  res.json(task);
});

async function startServer() {
  tasks = await loadTasks();
  app.listen(PORT, () => {
    console.log(`Task Manager running at http://localhost:${PORT}`);
  });
}

startServer();