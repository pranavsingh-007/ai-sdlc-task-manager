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
  const task = {
    id: Date.now(),
    title: req.body.title,
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