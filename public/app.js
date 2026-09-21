async function loadTasks() {
  const response = await fetch("/api/tasks");
  const tasks = await response.json();

  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";

  tasks.forEach(task => {
    const li = document.createElement("li");

    li.innerHTML = `
      <span class="${task.completed ? "completed" : ""}">
        ${task.title}
      </span>
      ${
        task.completed
          ? ""
          : `<button onclick="completeTask(${task.id})">Complete</button>`
      }
    `;

    taskList.appendChild(li);
  });
}

async function addTask() {
  const input = document.getElementById("taskInput");

  if (!input.value.trim()) {
    return;
  }

  await fetch("/api/tasks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: input.value
    })
  });

  input.value = "";
  loadTasks();
}

async function completeTask(id) {
  await fetch(`/api/tasks/${id}/complete`, {
    method: "PATCH"
  });

  loadTasks();
}

loadTasks();