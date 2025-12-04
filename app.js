const taskTitle = document.getElementById("task-title");
const taskNotes = document.getElementById("task-notes");
const taskDate = document.getElementById("task-date");
const taskTime = document.getElementById("task-time");
const taskList = document.getElementById("task-list");
const toast = document.getElementById("toast");
const emergencyInput = document.getElementById("emergency-number");
const seniorModeBtn = document.getElementById("senior-mode");
const locationStatus = document.getElementById("location-status");

let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

function showToast(msg) {
  toast.textContent = msg;
  toast.style.display = "block";
  setTimeout(() => toast.style.display = "none", 3000);
}

// --- INITIAL SETUP ---
function checkNotificationPermission() {
  if ('Notification' in window) {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }
}

function loadInitialData() {
  // Load Emergency Number
  const savedNumber = localStorage.getItem('emergencyNumber');
  if (savedNumber) emergencyInput.value = savedNumber;
  
  // Load Senior Mode
  if (localStorage.getItem('seniorMode') === 'true') {
    document.body.classList.add("large-text");
    seniorModeBtn.textContent = "👵 Senior Mode ON";
  }

  renderTasks();
  checkNotificationPermission();
}

// --- TASK MANAGEMENT ---
function saveTasks() {
  localStorage.setItem('tasks', JSON.stringify(tasks));
  renderTasks();
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  showToast("Task deleted");
}

function renderTasks() {
  taskList.innerHTML = '';
  if (tasks.length === 0) {
    taskList.innerHTML = '<p class="no-tasks">No tasks yet. Save one above!</p>';
    return;
  }

  tasks.forEach(task => {
    const li = document.createElement("li");
    li.className = 'task-item';
    
    // Format Date/Time for display
    let timeText = '';
    if (task.date && task.time) {
      const dateTime = new Date(`${task.date}T${task.time}`);
      timeText = ` - ${dateTime.toLocaleDateString()} ${dateTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }

    li.innerHTML = `
      <div>
        <strong>${task.title}</strong>
        <span class="task-time">${timeText}</span>
        ${task.notes ? `<p class="task-notes">${task.notes}</p>` : ''}
      </div>
    `;

    // Speak Button
    const speakBtn = document.createElement("button");
    speakBtn.textContent = "🔊";
    speakBtn.className = 'icon-btn';
    speakBtn.onclick = (e) => {
      e.stopPropagation();
      speak(task.title);
    };

    // Delete Button
    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "✖";
    deleteBtn.className = 'icon-btn delete-btn';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTask(task.id);
    };

    li.appendChild(speakBtn);
    li.appendChild(deleteBtn);
    taskList.appendChild(li);

    // Placeholder for real notification scheduling (not fully implemented here, needs a server/persistent background process for accuracy)
    if (task.date && task.time && Notification.permission === 'granted') {
      // In a real PWA, use a server or the Periodic Background Sync API for reliable scheduling.
      // This is a simple client-side check that is not reliable if the app is closed.
    }
  });
}

document.getElementById("save-btn").onclick = () => {
  if (!taskTitle.value.trim()) return showToast("Enter task title");

  const newTask = {
    id: Date.now(), // Unique ID
    title: taskTitle.value.trim(),
    notes: taskNotes.value.trim(),
    date: taskDate.value,
    time: taskTime.value
  };
  
  tasks.push(newTask);
  saveTasks();
  
  taskTitle.value = '';
  taskNotes.value = '';
  taskDate.value = '';
  taskTime.value = '';
  showToast("Task saved & added to list");
};

function speak(text) {
  if (!speechSynthesis) return;
  speechSynthesis.cancel();
  setTimeout(() => {
    speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }, 100);
}

// --- VOICE INPUT ---
document.getElementById("voice-btn").onclick = () => {
  if (!navigator.onLine) return showToast("Internet required for voice input");
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    return showToast("Speech recognition not supported");
  }

  const r = new (window.SpeechRecognition || webkitSpeechRecognition)();
  r.interimResults = false;
  r.continuous = false;
  r.onresult = e => {
    taskTitle.value = e.results[0][0].transcript;
    showToast("Voice input complete");
  };
  r.onerror = e => showToast(`Voice error: ${e.error}`);
  r.start();
  showToast("Listening...");
};

// --- EMERGENCY ---
emergencyInput.oninput = () => {
  localStorage.setItem('emergencyNumber', emergencyInput.value.trim());
};

document.getElementById("number-display").onclick = async () => {
  const num = emergencyInput.value.trim();
  if (!num) return showToast("Enter emergency number first");
  await navigator.clipboard.writeText(num);
  showToast("Number copied");
};

document.getElementById("call-btn").onclick = () => {
  const num = emergencyInput.value.trim();
  if (!num) return showToast("Enter emergency number");
  if (!confirm(`Call emergency contact ${num}?`)) return;

  const mobile = /Android|iPhone|iPod/i.test(navigator.userAgent);
  if (mobile) location.href = `tel:${num}`;
  else openQR(num);
};

// --- QR ---
function openQR(num) {
  document.getElementById("qr-modal").style.display = "flex"; // Changed to flex for better centering
  // Clear previous canvas content
  const canvas = document.getElementById("qr-canvas");
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  
  QRCode.toCanvas(
    canvas,
    `tel:${num}`,
    { errorCorrectionLevel: 'H', width: 256 }
  ).catch(err => console.error(err));
}

document.getElementById("close-qr").onclick =
  () => document.getElementById("qr-modal").style.display = "none";

// --- LOCATION ---
document.getElementById("location-btn").onclick = () => {
  locationStatus.textContent = "Getting location...";
  navigator.geolocation.getCurrentPosition(
    p => {
      // FIXED: Corrected the Google Maps URL
      const link = `http://maps.google.com/maps?q=${p.coords.latitude},${p.coords.longitude}`;
      navigator.clipboard.writeText(link);
      showToast("Location link copied");
      locationStatus.textContent = `Location copied: ${p.coords.latitude}, ${p.coords.longitude}`;
    },
    (error) => {
      let msg = "Allow location access";
      if (error.code === error.PERMISSION_DENIED) {
        msg = "Location access denied. Please enable it in browser settings.";
      }
      showToast(msg);
      locationStatus.textContent = msg;
    },
    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
  );
};

// --- SENIOR MODE ---
seniorModeBtn.onclick = () => {
  const isLarge = document.body.classList.toggle("large-text");
  seniorModeBtn.textContent = isLarge ? "👵 Senior Mode ON" : "👴 Senior Mode OFF";
  localStorage.setItem('seniorMode', isLarge);
  showToast(isLarge ? "Senior Mode Activated" : "Senior Mode Deactivated");
};

// --- OFFLINE STATUS ---
const status = document.getElementById("offline-status");
const update = () => {
  const isOnline = navigator.onLine;
  status.textContent = isOnline ? "Online" : "Offline";
  status.className = isOnline ? "online" : "offline";
};
window.addEventListener("online", update);
window.addEventListener("offline", update);

// --- SERVICE WORKER ---
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").then(() => {
    console.log("Service Worker Registered");
  });
}

// --- APP START ---
update(); // Initial status check
loadInitialData(); // Load saved data