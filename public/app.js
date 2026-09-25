function showError(message) {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  const errorBox = document.getElementById("errorBox");
  errorBox.textContent = "";
  errorBox.classList.add("hidden");
}

async function loadTasks() {
  try {
    const response = await fetch("/api/tasks");

    if (!response.ok) {
      showError("Failed to load tasks. Please try again.");
      return;
    }

    const tasks = await response.json();

    clearError();

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
  } catch (error) {
    showError("Failed to load tasks. Please check your connection.");
  }
}

async function addTask() {
  const input = document.getElementById("taskInput");

  if (!input.value.trim()) {
    showError("Please enter a task title.");
    return;
  }

  try {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: input.value
      })
    });

    if (!response.ok) {
      try {
        const data = await response.json();
        showError(data.message || "Failed to add task. Please try again.");
      } catch (parseError) {
        showError("Failed to add task. Please try again.");
      }
      return;
    }

    clearError();
    input.value = "";
    loadTasks();
  } catch (error) {
    showError("Failed to add task. Please check your connection.");
  }
}

async function completeTask(id) {
  try {
    const response = await fetch(`/api/tasks/${id}/complete`, {
      method: "PATCH"
    });

    if (!response.ok) {
      try {
        const data = await response.json();
        showError(data.message || "Failed to complete task. Please try again.");
      } catch (parseError) {
        showError("Failed to complete task. Please try again.");
      }
      return;
    }

    clearError();
    loadTasks();
  } catch (error) {
    showError("Failed to complete task. Please check your connection.");
  }
}

loadTasks();