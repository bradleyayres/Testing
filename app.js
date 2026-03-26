const STORAGE_KEY = "scaffoldflow_jobs_v3";

const seedJobs = [
  {
    id: crypto.randomUUID(),
    areaTown: "Leeds",
    sorCode: "SOR-1001",
    toBeConfirmed: "No",
    purchaseNumber: "PO-9981",
    jobNumber: "J-4501",
    date: "2026-03-28",
    amPm: "AM",
    address: "12 Harper Road",
    postCode: "LS1 2AB",
    area: "North",
    accessRequiredFor: "Roof edge work",
    durationHireDays: "7",
    operativeName: "James Cole",
    operativeContact: "07123 456789",
    supervisorName: "Nina Patel",
    supervisorEmail: "nina@scaffoldflow.com",
    comments: [{ text: "Initial booking created", createdAt: new Date().toISOString() }]
  }
];

const state = {
  jobs: loadJobs(),
  monthCursor: new Date(),
  editingId: null,
  draftComments: []
};

const dashboardView = document.getElementById("dashboardView");
const calendarView = document.getElementById("calendarView");
const calendarToggleBtn = document.getElementById("calendarToggleBtn");
const jobsTableBody = document.getElementById("jobsTableBody");
const dashboardCards = document.getElementById("dashboardCards");
const monthLabel = document.getElementById("monthLabel");
const calendar = document.getElementById("calendar");
const jobDialog = document.getElementById("jobDialog");
const jobForm = document.getElementById("jobForm");
const dialogTitle = document.getElementById("dialogTitle");
const commentsHistory = document.getElementById("commentsHistory");
const newCommentInput = document.getElementById("newCommentInput");

function loadJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedJobs;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : seedJobs;
  } catch {
    return seedJobs;
  }
}

function saveJobs() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.jobs));
}

function render() {
  renderCards();
  renderTable();
  renderCalendar();
}

function renderCards() {
  const total = state.jobs.length;
  const amCount = state.jobs.filter((j) => j.amPm === "AM").length;
  const pmCount = state.jobs.filter((j) => j.amPm === "PM").length;
  const tbcCount = state.jobs.filter((j) => (j.toBeConfirmed || "").toLowerCase() === "yes").length;

  dashboardCards.innerHTML = [
    ["Total Jobs", total],
    ["AM Jobs", amCount],
    ["PM Jobs", pmCount],
    ["To Be Confirmed", tbcCount]
  ].map(([label, value]) => `<article class="card"><div class="value">${value}</div><div>${label}</div></article>`).join("");
}

function renderTable() {
  jobsTableBody.innerHTML = state.jobs
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((j) => `
      <tr>
        <td>${j.jobNumber}</td>
        <td>${j.areaTown || ""}</td>
        <td>${formatDate(j.date)}</td>
        <td>${j.amPm || ""}</td>
        <td>${j.sorCode || ""}</td>
        <td>${j.operativeName || ""}</td>
        <td><button class="btn btn-secondary open-btn" data-id="${j.id}">Open</button></td>
      </tr>
    `).join("");

  document.querySelectorAll(".open-btn").forEach((btn) => {
    btn.addEventListener("click", () => openEdit(btn.dataset.id));
  });
}

function renderCalendar() {
  const first = new Date(state.monthCursor.getFullYear(), state.monthCursor.getMonth(), 1);
  const month = first.getMonth();
  monthLabel.textContent = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const parts = [];
  ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].forEach((d) => parts.push(`<div class="cal-head">${d}</div>`));
  for (let i = 0; i < first.getDay(); i += 1) parts.push('<div class="cal-day cal-off"></div>');

  let day = 1;
  while (true) {
    const dateObj = new Date(first.getFullYear(), first.getMonth(), day);
    if (dateObj.getMonth() !== month) break;
    const iso = dateObj.toISOString().slice(0, 10);
    const dayJobs = state.jobs.filter((j) => j.date === iso);

    parts.push(`<div class="cal-day"><div>${day}</div>${dayJobs.map((j) => `<div class="cal-badge">${j.jobNumber} ${j.amPm}</div>`).join("")}</div>`);
    day += 1;
  }

  calendar.innerHTML = parts.join("");
}

function formatDate(iso) {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString();
}

function openNew() {
  state.editingId = null;
  state.draftComments = [];
  dialogTitle.textContent = "Add Job";
  jobForm.reset();
  renderComments();
  document.getElementById("deleteBtn").style.display = "none";
  jobDialog.showModal();
}

function openEdit(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;
  state.editingId = id;
  state.draftComments = Array.isArray(job.comments) ? [...job.comments] : [];
  dialogTitle.textContent = `Edit Job ${job.jobNumber}`;
  for (const [k, v] of Object.entries(job)) {
    if (jobForm.elements[k]) jobForm.elements[k].value = v;
  }
  renderComments();
  document.getElementById("deleteBtn").style.display = "inline-block";
  jobDialog.showModal();
}

function renderComments() {
  commentsHistory.innerHTML = state.draftComments.length
    ? state.draftComments.map((c) => `<div class="comment-item">${escapeHtml(c.text)}<small>${new Date(c.createdAt).toLocaleString()}</small></div>`).join("")
    : '<div class="comment-item"><small>No comments yet.</small></div>';
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function toggleView() {
  const showCalendar = !calendarView.classList.contains("active");
  dashboardView.classList.toggle("active", !showCalendar);
  calendarView.classList.toggle("active", showCalendar);
  calendarToggleBtn.textContent = showCalendar ? "Dashboard" : "Bookings Calendar";
}

document.getElementById("newBookingBtn").addEventListener("click", openNew);
calendarToggleBtn.addEventListener("click", toggleView);

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() - 1);
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.monthCursor.setMonth(state.monthCursor.getMonth() + 1);
  renderCalendar();
});

document.getElementById("cancelBtn").addEventListener("click", () => jobDialog.close());

document.getElementById("deleteBtn").addEventListener("click", () => {
  if (!state.editingId) return;
  state.jobs = state.jobs.filter((j) => j.id !== state.editingId);
  saveJobs();
  jobDialog.close();
  render();
});

document.getElementById("addCommentBtn").addEventListener("click", () => {
  const text = newCommentInput.value.trim();
  if (!text) return;
  state.draftComments.push({ text, createdAt: new Date().toISOString() });
  newCommentInput.value = "";
  renderComments();
});

jobForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(jobForm).entries());
  payload.comments = state.draftComments;

  if (state.editingId) {
    const idx = state.jobs.findIndex((j) => j.id === state.editingId);
    state.jobs[idx] = { ...state.jobs[idx], ...payload };
  } else {
    state.jobs.push({ id: crypto.randomUUID(), ...payload });
  }

  saveJobs();
  jobDialog.close();
  render();
});

render();
