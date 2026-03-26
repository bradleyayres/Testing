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
  jobs: [],
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
const deleteBtn = document.getElementById("deleteBtn");

function normalizeComments(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map((c) => {
      if (!c) return null;
      if (typeof c === "string") return { text: c, createdAt: new Date().toISOString() };
      return { text: String(c.text || ""), createdAt: c.createdAt || new Date().toISOString() };
    })
    .filter(Boolean)
    .filter((c) => c.text.trim().length > 0);
}

function normalizeJob(job) {
  const j = job || {};
  return {
    id: j.id || crypto.randomUUID(),
    areaTown: j.areaTown || "",
    sorCode: j.sorCode || "",
    toBeConfirmed: j.toBeConfirmed || "",
    purchaseNumber: j.purchaseNumber || "",
    jobNumber: j.jobNumber || "",
    date: j.date || "",
    amPm: j.amPm || "",
    address: j.address || "",
    postCode: j.postCode || "",
    area: j.area || "",
    accessRequiredFor: j.accessRequiredFor || "",
    durationHireDays: j.durationHireDays || "",
    operativeName: j.operativeName || "",
    operativeContact: j.operativeContact || "",
    supervisorName: j.supervisorName || "",
    supervisorEmail: j.supervisorEmail || "",
    comments: normalizeComments(j.comments)
  };
}

function loadJobs() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedJobs.map(normalizeJob);

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedJobs.map(normalizeJob);
    const clean = parsed.map(normalizeJob);
    return clean.length ? clean : seedJobs.map(normalizeJob);
  } catch {
    return seedJobs.map(normalizeJob);
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
    .sort((a, b) => new Date(a.date || "2100-01-01") - new Date(b.date || "2100-01-01"))
    .map((j) => `
      <tr>
        <td>${escapeHtml(j.jobNumber)}</td>
        <td>${escapeHtml(j.areaTown)}</td>
        <td>${formatDate(j.date)}</td>
        <td>${escapeHtml(j.amPm)}</td>
        <td>${escapeHtml(j.sorCode)}</td>
        <td>${escapeHtml(j.operativeName)}</td>
        <td><button class="btn btn-secondary open-btn" data-id="${j.id}">Open</button></td>
      </tr>
    `).join("");

  const buttons = document.querySelectorAll(".open-btn");
  buttons.forEach((btn) => btn.addEventListener("click", () => openEdit(btn.dataset.id)));
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
    parts.push(`<div class="cal-day"><div>${day}</div>${dayJobs.map((j) => `<div class="cal-badge">${escapeHtml(j.jobNumber)} ${escapeHtml(j.amPm)}</div>`).join("")}</div>`);
    day += 1;
  }

  calendar.innerHTML = parts.join("");
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function openNew() {
  state.editingId = null;
  state.draftComments = [];
  dialogTitle.textContent = "Add Job";
  jobForm.reset();
  renderComments();
  deleteBtn.style.display = "none";
  showDialog();
}

function openEdit(id) {
  const job = state.jobs.find((j) => j.id === id);
  if (!job) return;

  state.editingId = id;
  state.draftComments = normalizeComments(job.comments);
  dialogTitle.textContent = `Edit Job ${job.jobNumber || ""}`;

  Object.keys(job).forEach((key) => {
    if (jobForm.elements[key]) jobForm.elements[key].value = job[key];
  });

  renderComments();
  deleteBtn.style.display = "inline-block";
  showDialog();
}

function showDialog() {
  if (typeof jobDialog.showModal === "function") {
    jobDialog.showModal();
  } else {
    jobDialog.setAttribute("open", "open");
  }
}

function closeDialog() {
  if (typeof jobDialog.close === "function") {
    jobDialog.close();
  } else {
    jobDialog.removeAttribute("open");
  }
}

function renderComments() {
  if (!state.draftComments.length) {
    commentsHistory.innerHTML = '<div class="comment-item"><small>No comments yet.</small></div>';
    return;
  }

  commentsHistory.innerHTML = state.draftComments
    .map((c) => {
      const when = new Date(c.createdAt);
      const label = Number.isNaN(when.getTime()) ? "Unknown time" : when.toLocaleString();
      return `<div class="comment-item">${escapeHtml(c.text)}<small>${label}</small></div>`;
    })
    .join("");
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toggleView() {
  const showCalendar = !calendarView.classList.contains("active");
  dashboardView.classList.toggle("active", !showCalendar);
  calendarView.classList.toggle("active", showCalendar);
  calendarToggleBtn.textContent = showCalendar ? "Dashboard" : "Bookings Calendar";
}

function init() {
  state.jobs = loadJobs();
  render();

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

  document.getElementById("cancelBtn").addEventListener("click", closeDialog);

  deleteBtn.addEventListener("click", () => {
    if (!state.editingId) return;
    state.jobs = state.jobs.filter((j) => j.id !== state.editingId);
    saveJobs();
    closeDialog();
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
    const payload = normalizeJob(Object.fromEntries(new FormData(jobForm).entries()));
    payload.comments = normalizeComments(state.draftComments);

    if (state.editingId) {
      const idx = state.jobs.findIndex((j) => j.id === state.editingId);
      if (idx >= 0) state.jobs[idx] = { ...state.jobs[idx], ...payload, id: state.editingId };
    } else {
      state.jobs.push({ ...payload, id: crypto.randomUUID() });
    }

    saveJobs();
    closeDialog();
    render();
  });
}

init();
