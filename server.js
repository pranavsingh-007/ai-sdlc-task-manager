const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let tasks = [
  { id: 1, title: "Complete AI Course", completed: false },
  { id: 2, title: "Review automation scripts", completed: false }
];

app.get("/api/tasks", (req, res) => {
  res.json(tasks);
});

app.post("/api/tasks", (req, res) => {
  const task = {
    id: Date.now(),
    title: req.body.title,
    completed: false
  };

  tasks.push(task);
  res.status(201).json(task);
});

app.patch("/api/tasks/:id/complete", (req, res) => {
  const task = tasks.find(t => t.id === Number(req.params.id));

  if (!task) {
    return res.status(404).json({ message: "Task not found" });
  }

  task.completed = true;
  res.json(task);
});

app.listen(PORT, () => {
  console.log(`Task Manager running at http://localhost:${PORT}`);
});